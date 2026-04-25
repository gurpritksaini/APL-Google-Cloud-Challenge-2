/**
 * MessageBubble — renders a single chat message.
 *
 * User messages appear right-aligned with the accent gradient.
 * Assistant messages appear left-aligned with an avatar, card background,
 * and an optional strategy badge beneath showing how the AI approached the turn.
 */

// Label and colour for the small strategy hint shown under each assistant bubble.
const STRAT_BADGE = {
  socratic:           { label:'Socratic',  color:'#a78bfa' },
  analogies:          { label:'Analogy',   color:'#34d399' },
  worked_examples:    { label:'Example',   color:'#60a5fa' },
  direct_explanation: { label:'Direct',    color:'#fbbf24' },
  review:             { label:'Review',    color:'#f87171' },
};

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const badge = !isUser && message.meta?.teaching_strategy ? STRAT_BADGE[message.meta.teaching_strategy] : null;

  if (isUser) {
    return (
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:20, paddingLeft:48 }}>
        <div style={{
          maxWidth:'72%',
          padding:'12px 16px',
          borderRadius:'18px 18px 4px 18px',
          background:'linear-gradient(135deg, var(--accent), var(--accent-2))',
          color:'#fff',
          fontSize:14,
          lineHeight:1.65,
          fontWeight:400,
          boxShadow:'0 4px 16px var(--accent-glow)',
        }}>
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:'flex', gap:10, marginBottom:20, paddingRight:48 }}>
      {/* Avatar */}
      <div style={{ flexShrink:0, width:34, height:34, borderRadius:10, background:'linear-gradient(135deg, var(--accent), var(--accent-2))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, boxShadow:'0 4px 12px var(--accent-glow)', marginTop:2 }}>
        🎓
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:6, maxWidth:'80%' }}>
        <div style={{
          padding:'12px 16px',
          borderRadius:'4px 18px 18px 18px',
          background:'var(--bg-card)',
          border:'1px solid var(--border)',
          color:'var(--text)',
          fontSize:14,
          lineHeight:1.7,
          fontWeight:400,
        }}>
          {message.content}
        </div>

        {badge && (
          <span style={{ fontSize:11, fontWeight:600, color:badge.color, opacity:0.8 }}>
            ↳ {badge.label}
          </span>
        )}
      </div>
    </div>
  );
}
