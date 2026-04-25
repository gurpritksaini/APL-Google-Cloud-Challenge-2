/**
 * SetupScreen — initial screen for entering a Gemini API key.
 *
 * Validates that the key starts with "AIza" and is at least 30 characters
 * before persisting it to localStorage. Also offers a "Demo" path that sets
 * the key to the sentinel value "DEMO", bypassing the real Gemini API entirely.
 *
 * The key is stored only in the user's browser — it is never sent to our servers,
 * only forwarded directly to the Gemini API in the X-API-Key request header.
 */
import { useState } from 'react';

export default function SetupScreen({ onSave }) {
  const [key, setKey] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');

  const handleDemo = () => {
    localStorage.setItem('grasp_api_key', 'DEMO');
    onSave('DEMO');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) { setError('Enter your Gemini API key to continue.'); return; }
    if (!trimmed.startsWith('AIza') || trimmed.length < 30) {
      setError('That doesn\'t look like a valid Gemini key. Keys start with "AIza" and are ~39 characters.');
      return;
    }
    localStorage.setItem('grasp_api_key', trimmed);
    onSave(trimmed);
  };

  return (
    <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px', background:'var(--bg)', position:'relative', overflow:'hidden' }}>

      {/* Background orbs */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:'15%', left:'20%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)', animation:'floatOrb 18s ease-in-out infinite' }} />
        <div style={{ position:'absolute', bottom:'10%', right:'15%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(79,70,229,0.12) 0%, transparent 70%)', animation:'floatOrb 22s ease-in-out infinite reverse' }} />
      </div>

      <div className="fade-up" style={{ width:'100%', maxWidth:440, position:'relative', zIndex:1 }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:64, height:64, borderRadius:20, background:'linear-gradient(135deg, var(--accent), var(--accent-2))', fontSize:28, marginBottom:20, boxShadow:'0 8px 32px var(--accent-glow)' }}>
            🎓
          </div>
          <h1 style={{ fontSize:28, fontWeight:800, letterSpacing:'-0.5px', color:'var(--text)', marginBottom:8 }}>Welcome to Grasp</h1>
          <p style={{ color:'var(--text-2)', fontSize:14, lineHeight:1.6 }}>
            Your AI-powered Socratic tutor. Learn anything through guided conversation.
          </p>
        </div>

        {/* Card */}
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:var_('--radius-xl'), padding:'32px', boxShadow:'var(--shadow-card)' }}>

          {/* Info banner */}
          <div style={{ display:'flex', gap:10, padding:'12px 14px', borderRadius:var_('--radius'), background:'var(--accent-soft)', border:'1px solid rgba(124,58,237,0.2)', marginBottom:24 }}>
            <span style={{ fontSize:16, flexShrink:0 }}>🔑</span>
            <p style={{ fontSize:12, color:'var(--text-2)', lineHeight:1.6 }}>
              Grasp uses your Gemini API key — stored only in your browser, never on a server.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-2)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>
              Gemini API Key
            </label>

            <div style={{ position:'relative', marginBottom:6 }}>
              <input
                type={visible ? 'text' : 'password'}
                value={key}
                onChange={e => { setKey(e.target.value); setError(''); }}
                placeholder="AIzaSy..."
                autoFocus
                style={{
                  width:'100%', padding:'12px 44px 12px 14px',
                  borderRadius:var_('--radius'), border:`1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
                  background:'var(--bg-input)', color:'var(--text)', fontFamily:'var(--font)',
                  fontSize:14, outline:'none', transition:'border-color 0.15s',
                }}
                onFocus={e => { if (!error) e.target.style.borderColor = 'var(--accent)'; }}
                onBlur={e => { if (!error) e.target.style.borderColor = 'var(--border)'; }}
              />
              <button
                type="button"
                onClick={() => setVisible(v => !v)}
                style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', fontSize:16, padding:4 }}
                aria-label={visible ? 'Hide' : 'Show'}
              >
                {visible ? '🙈' : '👁️'}
              </button>
            </div>

            {error && (
              <p style={{ fontSize:12, color:'var(--danger)', marginBottom:12 }}>{error}</p>
            )}

            <p style={{ fontSize:12, color:'var(--text-3)', marginBottom:20 }}>
              Need a key?{' '}
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color:'var(--accent)', textDecoration:'none', fontWeight:500 }}>
                Get one free at Google AI Studio →
              </a>
            </p>

            <button type="submit" className="btn-primary" style={{ width:'100%', padding:'13px' }}>
              Start Learning
            </button>
          </form>

          <div style={{ display:'flex', alignItems:'center', gap:12, margin:'20px 0 0' }}>
            <div style={{ flex:1, height:1, background:'var(--border)' }} />
            <span style={{ fontSize:11, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>or</span>
            <div style={{ flex:1, height:1, background:'var(--border)' }} />
          </div>

          <button
            type="button"
            onClick={handleDemo}
            style={{
              width:'100%', marginTop:16, padding:'12px',
              borderRadius:var_('--radius'), border:'1px solid var(--border)',
              background:'transparent', color:'var(--text-2)', fontFamily:'var(--font)',
              fontSize:14, fontWeight:500, cursor:'pointer', transition:'all 0.15s',
            }}
            onMouseEnter={e => { e.target.style.background = 'var(--bg-hover)'; e.target.style.borderColor = 'var(--accent)'; e.target.style.color = 'var(--text)'; }}
            onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-2)'; }}
          >
            Try Demo (no API key needed)
          </button>
        </div>

        <p style={{ textAlign:'center', fontSize:12, color:'var(--text-3)', marginTop:20 }}>
          Powered by Gemini 2.0 Flash · ChromaDB memory
        </p>
      </div>
    </div>
  );
}

// Tiny helper to use CSS var in inline style
function var_(v) { return `var(${v})`; }
