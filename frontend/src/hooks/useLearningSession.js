/**
 * useLearningSession — central state hook for a Grasp tutoring session.
 *
 * Manages:
 *   - Session lifecycle (start, resume, reset)
 *   - Message list and scroll-to-bottom behaviour
 *   - SessionMeta updates (mastery, difficulty, strategy) from each API response
 *   - Error handling with specific flows for invalid key and quota errors
 *
 * Consumed by App.jsx and passed down as props to ChatSession.
 */
import { useState, useRef, useCallback } from 'react';
import { startSession, sendMessage, getSession } from '../utils/api';

// Fallback meta used at session start and after a reset — matches the backend default.
const DEFAULT_META = {
  concepts_taught: [],
  current_concept: '',
  mastery_signals: 'none',
  difficulty_level: 'beginner',
  teaching_strategy: 'socratic',
};

/** Upsert a session entry in localStorage so it appears in the "Continue Learning" list. */
function saveSessionToStorage(session_id, topic) {
  const saved = JSON.parse(localStorage.getItem('grasp_sessions') || '[]');
  const entry = { session_id, topic, started_at: new Date().toISOString() };
  // Keep at most 10 sessions; move the current one to the top if it already exists.
  const updated = [entry, ...saved.filter(s => s.session_id !== session_id)].slice(0, 10);
  localStorage.setItem('grasp_sessions', JSON.stringify(updated));
}

export function useLearningSession(apiKey, onInvalidKey) {
  const [messages, setMessages] = useState([]);
  const [sessionMeta, setSessionMeta] = useState(DEFAULT_META);
  const [sessionId, setSessionId] = useState(null);
  const [topic, setTopic] = useState('');
  // The opening user prompt is stored separately so it can always be prepended to
  // the Gemini history as the first turn — Gemini rejects histories that start with
  // a model turn.
  const [openingPrompt, setOpeningPrompt] = useState('');
  const [progressOpen, setProgressOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  /** Append a message to the list and scroll the chat to the bottom. */
  const addMessage = useCallback((role, content, meta = null) => {
    setMessages(prev => [
      ...prev,
      // Stable unique ID prevents React key collisions when messages arrive quickly.
      { role, content, meta, id: `${Date.now()}-${Math.random()}` },
    ]);
    setTimeout(scrollToBottom, 50);
  }, []);

  /** Start a brand-new session: creates a session on the backend and sends the opening prompt. */
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

  /** Resume a past session: loads history from the backend and restores it to the message list. */
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

  /** Send a user message, update the message list optimistically, then await the AI reply. */
  const send = useCallback(async (text) => {
    if (!text.trim() || isLoading || !sessionId) return;
    setError(null);

    addMessage('user', text);
    setIsLoading(true);

    // History sent to the backend is:
    //   [user:openingPrompt, ...last 18 visible turns]
    // The opening prompt is always first so Gemini never sees a history that starts
    // with a model turn (which it rejects). 18 visible turns + 1 opening = 19 max,
    // safely under the 20-turn limit enforced by the backend.
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

  /** Reset all session state to defaults — called when navigating back to the topic picker. */
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
