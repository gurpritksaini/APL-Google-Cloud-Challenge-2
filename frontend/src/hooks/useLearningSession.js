import { useState, useRef, useCallback } from 'react';
import { startSession, sendMessage, getSession } from '../utils/api';

const DEFAULT_META = {
  concepts_taught: [],
  current_concept: '',
  mastery_signals: 'none',
  difficulty_level: 'beginner',
  teaching_strategy: 'socratic',
};

function saveSessionToStorage(session_id, topic) {
  const saved = JSON.parse(localStorage.getItem('grasp_sessions') || '[]');
  const entry = { session_id, topic, started_at: new Date().toISOString() };
  const updated = [entry, ...saved.filter(s => s.session_id !== session_id)].slice(0, 10);
  localStorage.setItem('grasp_sessions', JSON.stringify(updated));
}

export function useLearningSession(apiKey, onInvalidKey) {
  const [messages, setMessages] = useState([]);
  const [sessionMeta, setSessionMeta] = useState(DEFAULT_META);
  const [sessionId, setSessionId] = useState(null);
  const [topic, setTopic] = useState('');
  // Store the opening user prompt so it always anchors the Gemini history as
  // the first user turn — Gemini rejects conversations that start with a model turn.
  const [openingPrompt, setOpeningPrompt] = useState('');
  const [progressOpen, setProgressOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const addMessage = useCallback((role, content, meta = null) => {
    setMessages(prev => [
      ...prev,
      { role, content, meta, id: `${Date.now()}-${Math.random()}` },
    ]);
    setTimeout(scrollToBottom, 50);
  }, []);

  const selectTopic = useCallback(async (selectedTopic) => {
    setError(null);
    setIsLoading(true);
    setTopic(selectedTopic);
    setMessages([]);
    setSessionMeta(DEFAULT_META);
    setOpeningPrompt('');

    try {
      const { session_id } = await startSession(selectedTopic, apiKey);
      setSessionId(session_id);
      saveSessionToStorage(session_id, selectedTopic);

      const prompt = `Let's start learning about ${selectedTopic}. Please begin our session.`;
      setOpeningPrompt(prompt);

      // Opening call: history is empty — Gemini sees [user: prompt]
      const data = await sendMessage(session_id, selectedTopic, prompt, [], apiKey);

      setSessionMeta(data.meta);
      addMessage('assistant', data.reply, data.meta);
    } catch (err) {
      if (err.message === 'INVALID_API_KEY') {
        onInvalidKey?.();
      } else if (err.message === 'QUOTA_EXCEEDED') {
        setError('Gemini free-tier quota exceeded. Wait ~1 minute and try again, or get a new key at aistudio.google.com.');
      } else {
        setError(err.message || 'Failed to start session. Please check your connection and try again.');
        addMessage('assistant', 'Sorry, I had trouble starting the session. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, addMessage, onInvalidKey]);

  const resumeSession = useCallback(async (savedSession) => {
    const { session_id, topic: savedTopic } = savedSession;
    setError(null);
    setIsLoading(true);
    setTopic(savedTopic);
    setMessages([]);
    setSessionMeta(DEFAULT_META);
    setOpeningPrompt('');
    setSessionId(session_id);

    try {
      const data = await getSession(session_id);
      const history = data.history || [];

      if (history.length === 0) {
        // Session was created but never had any turns — treat as new
        const prompt = `Let's continue learning about ${savedTopic}.`;
        setOpeningPrompt(prompt);
        const res = await sendMessage(session_id, savedTopic, prompt, [], apiKey);
        setSessionMeta(res.meta);
        addMessage('assistant', res.reply, res.meta);
        return;
      }

      // First user turn becomes the opening prompt (keeps Gemini history starting with 'user')
      const firstUserIdx = history.findIndex(m => m.role === 'user');
      const opening = firstUserIdx >= 0 ? history[firstUserIdx].content : `Let's continue learning about ${savedTopic}.`;
      setOpeningPrompt(opening);

      // Everything after the opening user turn is displayed in the chat UI
      const displayTurns = firstUserIdx >= 0 ? history.slice(firstUserIdx + 1) : history;
      const restored = displayTurns.map(m => ({
        role: m.role,
        content: m.content,
        meta: null,
        id: `${Date.now()}-${Math.random()}`,
      }));
      setMessages(restored);

      if (data.meta?.final_difficulty) {
        setSessionMeta(prev => ({ ...prev, difficulty_level: data.meta.final_difficulty }));
      }

      setTimeout(scrollToBottom, 100);
    } catch (err) {
      setError('Could not load session history — starting a fresh session.');
      const prompt = `Let's continue learning about ${savedTopic}.`;
      setOpeningPrompt(prompt);
      try {
        const res = await sendMessage(session_id, savedTopic, prompt, [], apiKey);
        setSessionMeta(res.meta);
        addMessage('assistant', res.reply, res.meta);
      } catch {
        // ignore secondary error
      }
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, addMessage]);

  const send = useCallback(async (text) => {
    if (!text.trim() || isLoading || !sessionId) return;
    setError(null);

    addMessage('user', text);
    setIsLoading(true);

    // Build history:
    //   1. Always prepend the opening user prompt so Gemini history starts with 'user'
    //   2. Followed by the visible conversation (last 18 turns to stay within limits)
    // Result: [user:opening, model:AI_reply, user:msg1, model:AI_reply2, ..., user:text]
    const visibleHistory = messages.slice(-18).map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));
    const history = openingPrompt
      ? [{ role: 'user', content: openingPrompt }, ...visibleHistory]
      : visibleHistory;

    try {
      const data = await sendMessage(sessionId, topic, text, history, apiKey);
      setSessionMeta(data.meta);
      addMessage('assistant', data.reply, data.meta);
    } catch (err) {
      if (err.message === 'INVALID_API_KEY') {
        onInvalidKey?.();
      } else if (err.message === 'QUOTA_EXCEEDED') {
        setError('Gemini free-tier quota exceeded. Wait ~1 minute and try again.');
      } else {
        setError(err.message || 'Message failed. Please try again.');
        addMessage('assistant', 'I had trouble responding — please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, topic, messages, openingPrompt, apiKey, isLoading, addMessage, onInvalidKey]);

  const resetSession = useCallback(() => {
    setMessages([]);
    setSessionMeta(DEFAULT_META);
    setSessionId(null);
    setTopic('');
    setOpeningPrompt('');
    setProgressOpen(false);
    setIsLoading(false);
    setError(null);
  }, []);

  return {
    messages,
    sessionMeta,
    sessionId,
    topic,
    progressOpen,
    setProgressOpen,
    isLoading,
    error,
    messagesEndRef,
    selectTopic,
    resumeSession,
    send,
    resetSession,
  };
}
