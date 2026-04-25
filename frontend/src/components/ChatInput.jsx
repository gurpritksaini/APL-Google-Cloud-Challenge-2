/**
 * ChatInput — text input area at the bottom of the chat screen.
 *
 * Submits on Enter (without Shift) so Shift+Enter can insert newlines.
 * The send button is disabled and unstyled when the input is empty or a
 * response is already loading to prevent double-sends.
 */
import { useState, useRef } from 'react';

export default function ChatInput({ onSend, isLoading }) {
  const [text, setText] = useState('');
  const ref = useRef(null);

  const submit = () => {
    if (!text.trim() || isLoading) return;
    onSend(text.trim());
    setText('');
    setTimeout(() => ref.current?.focus(), 0);
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  const canSend = !!text.trim() && !isLoading;

  return (
    <div style={{ padding:'12px 16px 16px', borderTop:'1px solid var(--border)', background:'var(--bg-1)', flexShrink:0 }}>
      <div style={{ maxWidth:720, margin:'0 auto', display:'flex', gap:10, alignItems:'flex-end' }}>
        <div style={{ flex:1, position:'relative' }}>
          <textarea
            ref={ref}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={onKey}
            placeholder="Type your answer… (Enter to send, Shift+Enter for newline)"
            rows={1}
            disabled={isLoading}
            style={{
              width:'100%', padding:'11px 14px', borderRadius:var_('--radius-lg'),
              border:'1px solid var(--border)',
              background:'var(--bg-input)',
              color:'var(--text)', fontFamily:'var(--font)', fontSize:14,
              lineHeight:1.6, resize:'none', outline:'none',
              transition:'border-color 0.15s',
              maxHeight:120, overflowY:'auto',
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            aria-label="Message"
          />
        </div>

        <button
          onClick={submit}
          disabled={!canSend}
          style={{
            flexShrink:0, width:42, height:42, borderRadius:var_('--radius'),
            border:'none', cursor: canSend ? 'pointer' : 'not-allowed',
            background: canSend ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : 'var(--bg-2)',
            color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
            transition:'all 0.15s', fontSize:16,
            boxShadow: canSend ? '0 4px 14px var(--accent-glow)' : 'none',
          }}
          aria-label="Send"
        >
          {isLoading
            ? <span style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', display:'block', animation:'spin 0.7s linear infinite' }} />
            : '↑'
          }
        </button>
      </div>

      <p style={{ textAlign:'center', fontSize:11, color:'var(--text-3)', marginTop:8 }}>
        Grasp may make mistakes. Verify important information.
      </p>
    </div>
  );
}

function var_(v) { return `var(${v})`; }
