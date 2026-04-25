/**
 * ChatArea — scrollable message list for the active tutoring session.
 *
 * Renders each message via MessageBubble, shows a typing indicator while the
 * AI is responding, and displays an inline error toast when `error` is set.
 * The `messagesEndRef` div at the bottom is used by useLearningSession to
 * auto-scroll after each new message.
 */
import MessageBubble from './MessageBubble';

export default function ChatArea({ messages, isLoading, messagesEndRef, error }) {
  return (
    <div
      style={{ flex:1, overflowY:'auto', padding:'24px 16px 8px', background:'var(--bg)' }}
      role="log"
      aria-live="polite"
      aria-label="Conversation"
    >
      <div style={{ maxWidth:720, margin:'0 auto' }}>

        {messages.length === 0 && !isLoading && (
          <div className="fade-in" style={{ textAlign:'center', padding:'60px 0', color:'var(--text-3)' }}>
            <div style={{ fontSize:40, marginBottom:12, opacity:0.5 }}>🎓</div>
            <p style={{ fontSize:14 }}>Starting your session…</p>
          </div>
        )}

        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div style={{ display:'flex', gap:10, marginBottom:20, paddingRight:48 }}>
            <div style={{ flexShrink:0, width:34, height:34, borderRadius:10, background:'linear-gradient(135deg, var(--accent), var(--accent-2))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>
              🎓
            </div>
            <div style={{ padding:'14px 16px', borderRadius:'4px 18px 18px 18px', background:'var(--bg-card)', border:'1px solid var(--border)', display:'flex', gap:5, alignItems:'center' }}>
              {[0,1,2].map(i => (
                <span key={i} style={{ width:7, height:7, borderRadius:'50%', background:'var(--text-3)', display:'block', animation:`typingBounce 1.1s ease-in-out ${i*0.18}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        {/* Error toast */}
        {error && (
          <div className="fade-in" style={{ textAlign:'center', margin:'8px auto 16px', maxWidth:420 }}>
            <div style={{ display:'inline-flex', gap:8, alignItems:'center', padding:'10px 16px', borderRadius:var_('--radius'), background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', color:'#fca5a5', fontSize:13 }}>
              ⚠️ {error}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} style={{ height:4 }} />
      </div>
    </div>
  );
}

function var_(v) { return `var(${v})`; }
