/**
 * TopicSelection — home screen where the user picks a topic to study.
 *
 * Shows:
 *   - "Continue Learning" list of past sessions (from localStorage, max 5)
 *   - Preset topic grid (8 topics with icons and gradient cards)
 *   - Free-text "explore any topic" input
 *   - API key status pill that navigates to SetupScreen on click
 *
 * Past sessions are stored/read directly in localStorage by this component
 * and by useLearningSession — they share the key 'grasp_sessions'.
 */
import { useState, useEffect } from 'react';

// Preset topics displayed as cards in the grid. Each has a gradient and glow for hover effects.
const TOPICS = [
  { label:'Python',           icon:'🐍', grad:'linear-gradient(135deg,#166534,#16a34a)', glow:'rgba(22,163,74,0.3)' },
  { label:'JavaScript',       icon:'⚡', grad:'linear-gradient(135deg,#92400e,#d97706)', glow:'rgba(217,119,6,0.3)' },
  { label:'React',            icon:'⚛️', grad:'linear-gradient(135deg,#0e4d7a,#0ea5e9)', glow:'rgba(14,165,233,0.3)' },
  { label:'SQL',              icon:'🗄️', grad:'linear-gradient(135deg,#4c1d95,#7c3aed)', glow:'rgba(124,58,237,0.3)' },
  { label:'Data Structures',  icon:'🌲', grad:'linear-gradient(135deg,#134e4a,#0d9488)', glow:'rgba(13,148,136,0.3)' },
  { label:'Machine Learning', icon:'🤖', grad:'linear-gradient(135deg,#831843,#db2777)', glow:'rgba(219,39,119,0.3)' },
  { label:'Physics',          icon:'⚗️', grad:'linear-gradient(135deg,#7c2d12,#f97316)', glow:'rgba(249,115,22,0.3)' },
  { label:'Mathematics',      icon:'📐', grad:'linear-gradient(135deg,#1e3a5f,#3b82f6)', glow:'rgba(59,130,246,0.3)' },
];

export default function TopicSelection({ onSelect, onResume, apiKey, onManageKey }) {
  const [custom, setCustom] = useState('');
  const [hovered, setHovered] = useState(null);
  const [pastSessions, setPastSessions] = useState([]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('grasp_sessions') || '[]');
    setPastSessions(saved.slice(0, 5));
  }, []);

  const handleDelete = (session_id) => {
    const updated = pastSessions.filter(s => s.session_id !== session_id);
    setPastSessions(updated);
    localStorage.setItem('grasp_sessions', JSON.stringify(updated));
  };

  const isDemo = apiKey === 'DEMO';
  const hasKey = !!apiKey;

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (custom.trim()) onSelect(custom.trim());
  };

  return (
    <div style={{ minHeight:'100dvh', background:'var(--bg)', display:'flex', flexDirection:'column', alignItems:'center', padding:'48px 20px 40px', position:'relative', overflow:'hidden' }}>

      {/* Background glow */}
      <div style={{ position:'absolute', top:'30%', left:'50%', transform:'translate(-50%,-50%)', width:800, height:600, borderRadius:'50%', background:'radial-gradient(ellipse, rgba(124,58,237,0.07) 0%, transparent 70%)', pointerEvents:'none' }} />

      <div className="fade-up" style={{ width:'100%', maxWidth:680, position:'relative', zIndex:1 }}>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <div style={{ fontSize:44, marginBottom:16, filter:'drop-shadow(0 4px 16px rgba(124,58,237,0.4))' }}>🎓</div>
          <h1 style={{ fontSize:32, fontWeight:800, letterSpacing:'-0.8px', color:'var(--text)', marginBottom:10, lineHeight:1.2 }}>
            What do you want to learn?
          </h1>
          <p style={{ color:'var(--text-2)', fontSize:15, lineHeight:1.6 }}>
            Pick a topic. Your Socratic tutor will ask questions that guide you to discover answers yourself.
          </p>

          {/* API key status pill */}
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, marginTop:16, padding:'6px 14px', borderRadius:99, border:'1px solid var(--border)', background:'var(--bg-card)', cursor:'pointer' }} onClick={onManageKey}>
            <span style={{ width:7, height:7, borderRadius:'50%', background: hasKey ? (isDemo ? '#fbbf24' : '#34d399') : '#6b7280', flexShrink:0 }} />
            <span style={{ fontSize:12, color:'var(--text-2)', fontWeight:500 }}>
              {isDemo ? 'Demo mode' : hasKey ? 'API key set' : 'No API key — click to add'}
            </span>
            <span style={{ fontSize:11, color:'var(--text-3)' }}>⚙</span>
          </div>
        </div>

        {/* Continue Learning */}
        {pastSessions.length > 0 && (
          <div className="fade-up" style={{ marginBottom:32 }}>
            <p style={{ fontSize:12, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>
              Continue Learning
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {pastSessions.map(s => (
                <div key={s.session_id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:var_('--radius-lg') }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:'var(--text)' }}>{s.topic}</div>
                    <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>
                      {new Date(s.started_at).toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' })}
                    </div>
                  </div>
                  <button
                    onClick={() => onResume?.(s)}
                    className="btn-primary"
                    style={{ padding:'6px 16px', fontSize:13, flexShrink:0 }}
                  >
                    Resume →
                  </button>
                  <button
                    onClick={() => handleDelete(s.session_id)}
                    title="Remove from list"
                    style={{ background:'none', border:'none', color:'var(--text-3)', cursor:'pointer', fontSize:18, lineHeight:1, padding:'0 4px', flexShrink:0 }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Topic grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12, marginBottom:16 }}>
          {TOPICS.map(({ label, icon, grad, glow }, i) => (
            <button
              key={label}
              onClick={() => onSelect(label)}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              className="fade-up"
              style={{
                animationDelay:`${i * 0.05}s`,
                display:'flex', flexDirection:'column', alignItems:'flex-start', gap:10,
                padding:'18px 16px', borderRadius:var_('--radius-lg'),
                background: hovered === i ? 'var(--bg-2)' : 'var(--bg-card)',
                border:`1px solid ${hovered === i ? 'var(--border-hi)' : 'var(--border)'}`,
                cursor:'pointer', textAlign:'left',
                transform: hovered === i ? 'translateY(-3px)' : 'translateY(0)',
                boxShadow: hovered === i ? `0 8px 32px ${glow}` : 'none',
                transition:'all 0.2s ease',
              }}
            >
              {/* Icon with gradient bg */}
              <div style={{ width:40, height:40, borderRadius:10, background:grad, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0, boxShadow: hovered === i ? `0 4px 16px ${glow}` : 'none', transition:'box-shadow 0.2s' }}>
                {icon}
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', lineHeight:1.3 }}>{label}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Custom topic */}
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:var_('--radius-lg'), padding:'20px 20px' }}>
          <p style={{ fontSize:12, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>
            Or explore any topic
          </p>
          <form onSubmit={handleCustomSubmit} style={{ display:'flex', gap:10 }}>
            <input
              type="text"
              value={custom}
              onChange={e => setCustom(e.target.value)}
              placeholder="e.g. Quantum mechanics, Ancient Rome, Music theory..."
              style={{
                flex:1, padding:'11px 14px', borderRadius:var_('--radius'),
                border:'1px solid var(--border)', background:'var(--bg-input)',
                color:'var(--text)', fontFamily:'var(--font)', fontSize:14, outline:'none',
                transition:'border-color 0.15s',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={!custom.trim()}
              style={{ flexShrink:0, padding:'11px 20px' }}
            >
              Start →
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}

function var_(v) { return `var(${v})`; }
