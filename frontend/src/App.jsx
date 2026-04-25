/**
 * App — root component and top-level screen router.
 *
 * Screens:  loading → home (TopicSelection) ↔ setup (SetupScreen) ↔ chat (ChatSession)
 *
 * The API key is persisted in localStorage so users don't re-enter it on reload.
 * Screen transitions always go through this component so session state (useLearningSession)
 * is never left in a stale half-started state.
 */
import { useState, useEffect } from 'react';
import { checkHealth } from './utils/api';
import { useLearningSession } from './hooks/useLearningSession';
import SetupScreen from './components/SetupScreen';
import TopicSelection from './components/TopicSelection';
import ChatSession from './components/ChatSession';

export default function App() {
  // 'loading' shows a spinner while the health check completes on first mount.
  const [screen, setScreen] = useState('loading');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('grasp_api_key') || '');
  // Holds a topic the user tried to start before entering their API key,
  // so we can resume the intended flow after setup completes.
  const [pendingTopic, setPendingTopic] = useState('');

  // Called by useLearningSession when Gemini rejects the key mid-session.
  const handleInvalidKey = () => {
    localStorage.removeItem('grasp_api_key');
    setApiKey('');
    setScreen('setup');
  };

  const session = useLearningSession(apiKey, handleInvalidKey);

  useEffect(() => {
    // Health check is fire-and-forget — we advance to 'home' whether it passes or fails
    // so a backend hiccup doesn't permanently block the UI.
    checkHealth()
      .then(() => setScreen('home'))
      .catch(() => setScreen('home'));
  }, []); // eslint-disable-line

  const handleSaveKey = (key) => {
    setApiKey(key);
    setPendingTopic('');
    setScreen('home');
  };

  const handleSelectTopic = async (topic) => {
    if (!apiKey) {
      // Gate: store the intended topic and redirect to setup first.
      setPendingTopic(topic);
      setScreen('setup');
      return;
    }
    setScreen('chat');
    await session.selectTopic(topic);
  };

  const handleResumeTopic = async (savedSession) => {
    if (!apiKey) {
      setPendingTopic(savedSession.topic);
      setScreen('setup');
      return;
    }
    setScreen('chat');
    await session.resumeSession(savedSession);
  };

  const handleBack = () => {
    session.resetSession();
    setScreen('home');
  };

  const handleUpgradeFromDemo = () => {
    // Clear demo state fully so the user enters the real key flow clean.
    session.resetSession();
    localStorage.removeItem('grasp_api_key');
    setApiKey('');
    setScreen('setup');
  };

  if (screen === 'loading') {
    return (
      <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
        <div style={{ width:32, height:32, border:'3px solid var(--bg-2)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
      </div>
    );
  }

  if (screen === 'setup') return <SetupScreen onSave={handleSaveKey} />;

  if (screen === 'chat') {
    return (
      <ChatSession
        topic={session.topic}
        messages={session.messages}
        sessionMeta={session.sessionMeta}
        progressOpen={session.progressOpen}
        setProgressOpen={session.setProgressOpen}
        isLoading={session.isLoading}
        error={session.error}
        messagesEndRef={session.messagesEndRef}
        onSend={session.send}
        onBack={handleBack}
        onUpgradeFromDemo={handleUpgradeFromDemo}
        isDemo={apiKey === 'DEMO'}
      />
    );
  }

  return (
    <TopicSelection
      onSelect={handleSelectTopic}
      onResume={handleResumeTopic}
      apiKey={apiKey}
      onManageKey={() => setScreen('setup')}
    />
  );
}
