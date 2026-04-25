/**
 * ProgressPanel — collapsible panel showing live learning progress.
 *
 * Renders a mastery progress bar, current difficulty level, concepts-covered
 * count, and a tag cloud of all concepts taught so far.
 * Visibility is controlled by `isOpen` from the parent (ChatSession).
 */

// Maps mastery signal values to display label, CSS variable colours, and bar width percentage.
const MASTERY = {
  none:       { label:'No signal yet', fg:'var(--mastery-none-fg)',       bg:'var(--mastery-none)',       pct:'4%'  },
  emerging:   { label:'Emerging',      fg:'var(--mastery-emerging-fg)',   bg:'var(--mastery-emerging)',   pct:'30%' },
  developing: { label:'Developing',    fg:'var(--mastery-developing-fg)', bg:'var(--mastery-developing)', pct:'65%' },
  solid:      { label:'Solid',         fg:'var(--mastery-solid-fg)',       bg:'var(--mastery-solid)',       pct:'100%'},
};

const DIFF_ICON = { beginner:'🌱', intermediate:'🌿', advanced:'🌳' };

export default function ProgressPanel({ meta, isOpen }) {
  if (!isOpen) return null;

  const m = MASTERY[meta.mastery_signals] || MASTERY.none;

  return (
    <div className="slide-down" style={{
      padding:'16px 20px', borderBottom:'1px solid var(--border)',
      background:'var(--bg-1)',
    }}>
      <div style={{ maxWidth:720, margin:'0 auto', display:'flex', flexWrap:'wrap', gap:24, alignItems:'center' }}>

        {/* Mastery bar */}
        <div style={{ flex:'1 1 200px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <span style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Understanding</span>
            <span style={{ fontSize:11, fontWeight:700, color:m.fg }}>{m.label}</span>
          </div>
          <div style={{ height:5, borderRadius:99, background:'var(--bg-2)', overflow:'hidden' }}>
            <div style={{
              height:'100%', borderRadius:99, width:m.pct,
              background:`linear-gradient(90deg, ${m.fg}, ${m.fg}88)`,
              animation:'masteryGrow 0.6s ease both',
              transition:'width 0.5s ease',
            }} />
          </div>
        </div>

        {/* Difficulty */}
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          <span style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Difficulty</span>
          <span style={{ fontSize:13, color:'var(--text-2)', fontWeight:500 }}>
            {DIFF_ICON[meta.difficulty_level]} {meta.difficulty_level}
          </span>
        </div>

        {/* Concepts */}
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          <span style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Covered</span>
          <span style={{ fontSize:13, color:'var(--text-2)', fontWeight:500 }}>
            📚 {meta.concepts_taught.length}
          </span>
        </div>

        {/* Concept tags */}
        {meta.concepts_taught.length > 0 && (
          <div style={{ width:'100%', display:'flex', flexWrap:'wrap', gap:6 }}>
            {meta.concepts_taught.map(c => (
              <span key={c} style={{
                fontSize:11, fontWeight:500, padding:'3px 10px', borderRadius:99,
                background:'rgba(124,58,237,0.1)', color:'#a78bfa',
                border:'1px solid rgba(124,58,237,0.2)',
              }}>
                {c}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
