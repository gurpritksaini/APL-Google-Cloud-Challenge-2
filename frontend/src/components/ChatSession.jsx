import ChatHeader from './ChatHeader';
import ProgressPanel from './ProgressPanel';
import ChatArea from './ChatArea';
import ChatInput from './ChatInput';

export default function ChatSession({
  topic, messages, sessionMeta, progressOpen, setProgressOpen,
  isLoading, error, messagesEndRef, onSend, onBack, onUpgradeFromDemo, isDemo,
}) {
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100dvh', background:'var(--bg)' }}>
      {isDemo && (
        <div style={{ background:'rgba(251,191,36,0.1)', borderBottom:'1px solid rgba(251,191,36,0.25)', padding:'6px 16px', fontSize:12, color:'#fbbf24', textAlign:'center', flexShrink:0 }}>
          Demo Mode — responses are scripted.{' '}
          <button onClick={onUpgradeFromDemo} style={{ background:'none', border:'none', color:'#fbbf24', textDecoration:'underline', cursor:'pointer', fontSize:12, padding:0, fontFamily:'var(--font)' }}>
            Add a real API key
          </button>{' '}for full AI tutoring.
        </div>
      )}
      <ChatHeader
        topic={topic}
        meta={sessionMeta}
        progressOpen={progressOpen}
        onToggleProgress={() => setProgressOpen(o => !o)}
        onBack={onBack}
      />
      <ProgressPanel meta={sessionMeta} isOpen={progressOpen} />
      <ChatArea
        messages={messages}
        isLoading={isLoading}
        messagesEndRef={messagesEndRef}
        error={error}
      />
      <ChatInput onSend={onSend} isLoading={isLoading} />
    </div>
  );
}
