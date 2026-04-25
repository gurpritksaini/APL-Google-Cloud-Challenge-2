/**
 * ChatHeader — fixed top bar shown during an active session.
 *
 * Displays: back button, current topic + concept, active teaching strategy badge,
 * mastery signal dot, concepts-taught count, and the Progress panel toggle.
 * All values are derived from `meta` (SessionMeta) updated live by the backend.
 */

// Maps each teaching strategy to its display label and colour scheme.
const STRATEGY_META = {
  socratic:           { label:'Socratic',     color:'#a78bfa', bg:'rgba(167,139,250,0.12)' },
  analogies:          { label:'Analogy',      color:'#34d399', bg:'rgba(52,211,153,0.12)' },
  worked_examples:    { label:'Example',      color:'#60a5fa', bg:'rgba(96,165,250,0.12)' },
  direct_explanation: { label:'Direct',       color:'#fbbf24', bg:'rgba(251,191,36,0.12)' },
  review:             { label:'Review',       color:'#f87171', bg:'rgba(248,113,113,0.12)' },
};

// Colour for the live mastery-signal indicator dot in the header.
const MASTERY_DOT = {
  none:       '#4b5563',
  emerging:   '#fcd34d',
  developing: '#60a5fa',
  solid:      '#34d399',
};

export default function ChatHeader({ topic, meta, progressOpen, onToggleProgress, onBack }) {
  const strat = STRATEGY_META[meta.teaching_strategy] || STRATEGY_META.socratic;
  const masteryColor = MASTERY_DOT[meta.mastery_signals] || MASTERY_DOT.none;

  return (
    <header style={{
      display:'flex', alignItems:'center', gap:10, padding:'0 16px',
      height:56, flexShrink:0,
      background:'var(--bg-1)',
      borderBottom:'1px solid var(--border)',
    }}>
      {/* Back */}
      <button
        onClick={onBack}
        className="btn-ghost"
        style={{ padding:'6px 10px', flexShrink:0 }}
        aria-label="Back to topics"
        title="Back"
      >
        ← Back
      </button>

      <div style={{ width:'1px', height:20, background:'var(--border)', flexShrink:0 }} />

      {/* Topic + concept */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:13, fontWeight:700, color:'var(--text)', letterSpacing:'-0.2px' }}>
            {topic}
          </span>
          {meta.current_concept && (
            <>
              <span style={{ color:'var(--text-3)', fontSize:12 }}>·</span>
              <span style={{ fontSize:12, color:'var(--text-2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:200 }}>
                {meta.current_concept}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Strategy badge */}
      <span className="badge" style={{ background:strat.bg, color:strat.color, borderColor:'transparent', flexShrink:0 }}>
        {strat.label}
      </span>

      {/* Mastery dot + count */}
      <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:masteryColor, boxShadow:`0 0 6px ${masteryColor}`, transition:'background 0.3s' }} />
        <span style={{ fontSize:12, color:'var(--text-2)', fontWeight:500 }}>
          {meta.concepts_taught.length} concept{meta.concepts_taught.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ width:'1px', height:20, background:'var(--border)', flexShrink:0 }} />

      {/* Progress toggle */}
      <button
        onClick={onToggleProgress}
        className="btn-ghost"
        style={{
          flexShrink:0, padding:'6px 12px', fontSize:12,
          ...(progressOpen ? { background:'var(--accent-soft)', color:'var(--accent)', borderColor:'rgba(124,58,237,0.3)' } : {})
        }}
        aria-expanded={progressOpen}
      >
        {progressOpen ? 'Hide' : 'Progress'}
      </button>
    </header>
  );
}
