import { useState, useEffect } from 'react';
import { checkHealth } from './utils/api';
import { useLearningSession } from './hooks/useLearningSession';
import SetupScreen from './components/SetupScreen';
import TopicSelection from './components/TopicSelection';
import ChatSession from './components/ChatSession';

export default function App() {
  const [screen, setScreen] = useState('loading');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('grasp_api_key') || '');
  const [pendingTopic, setPendingTopic] = useState('');

  const handleInvalidKey = () => {
    localStorage.removeItem('grasp_api_key');
    setApiKey('');
    setScreen('setup');
  };

  const session = useLearningSession(apiKey, handleInvalidKey);

  useEffect(() => {
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
