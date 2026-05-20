'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ShapingCard, KinloomDraft } from '../ShapingCard';

function RadialBullet({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="10" cy="10" r="8" fill="none" stroke="#556b5b" strokeWidth="1" opacity="0.25" />
      <circle cx="10" cy="10" r="5" fill="none" stroke="#556b5b" strokeWidth="1" opacity="0.45" />
      <circle cx="10" cy="10" r="2.5" fill="#556b5b" opacity="0.75" />
    </svg>
  );
}

const ASK_OPTIONS = [
  { id: 'followup', label: 'Ask me a follow-up question' },
  { id: 'stuck',    label: "I'm stuck — help me continue" },
  { id: 'finish',   label: "I think I'm done — help me finish this" },
];

export default function CreateWritePage() {
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement>(null);
  const initSet = useRef(false);

  const [draft, setDraft] = useState<KinloomDraft>({ title: '', type: 'story', body: '' });
  const [wordCount, setWordCount] = useState(0);
  const [showShaping, setShowShaping] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [askWorking, setAskWorking] = useState(false);
  const [askResponse, setAskResponse] = useState<string | null>(null);

  // Restore draft from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('kinloom-draft');
      if (saved) {
        const d = JSON.parse(saved);
        setDraft(prev => ({ ...prev, ...d }));
        if (d.body && editorRef.current && !initSet.current) {
          editorRef.current.innerText = d.body;
          initSet.current = true;
          setWordCount(d.body.trim().split(/\s+/).filter(Boolean).length);
        }
      }
    } catch {}
  }, []);

  // Selection toolbar (bold/italic)
  const [selectionPos, setSelectionPos] = useState<{ left: number; top: number } | null>(null);
  useEffect(() => {
    const handler = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !editorRef.current?.contains(sel.anchorNode)) {
        setSelectionPos(null); return;
      }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      if (rect.width === 0) { setSelectionPos(null); return; }
      setSelectionPos({ left: rect.left + rect.width / 2, top: rect.top - 8 });
    };
    document.addEventListener('selectionchange', handler);
    return () => document.removeEventListener('selectionchange', handler);
  }, []);

  const onBodyInput = (e: React.FormEvent<HTMLDivElement>) => {
    const text = e.currentTarget.innerText;
    setDraft(d => ({ ...d, body: text }));
    setWordCount(text.trim().split(/\s+/).filter(Boolean).length);
  };

  const askAgent = async (askType: string) => {
    setAskWorking(true);
    setAskOpen(false);
    try {
      const res = await fetch('/api/kinloom-companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `Title: ${draft.title || '(untitled)'}\n\n${draft.body || '(nothing yet)'}` }],
          mode: 'assist',
          askType,
        }),
      });
      const data = await res.json();
      setAskResponse(data.reply || '');
    } catch {
      setAskResponse("Try sitting with what you already have for a moment. Read it back once, slowly.");
    }
    setAskWorking(false);
  };

  const handleSaved = (saved: KinloomDraft) => {
    try { localStorage.setItem('kinloom-saved', JSON.stringify(saved)); localStorage.removeItem('kinloom-draft'); } catch {}
    router.push('/create/saved');
  };

  const saveDraftAndExit = () => {
    try { localStorage.setItem('kinloom-draft', JSON.stringify(draft)); } catch {}
    router.push('/create');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fdfcfa', position: 'relative' }}>

      {/* Top bar */}
      <div className="creation-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#556b5b' }}>Create a kinloom</span>
          <span style={{ color: 'rgba(26,26,26,0.3)', fontSize: 12 }}>›</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#1a1a1a', fontWeight: 500, fontSize: 12 }}>
            <RadialBullet size={9} />
            Write
          </span>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <button className="topbar-link" onClick={saveDraftAndExit}>Save draft</button>
          <button className="topbar-link" onClick={() => router.push('/create/talk')}>Switch to Talk</button>
        </div>
      </div>

      {/* Writing surface */}
      <div style={{ flex: 1, padding: '72px 80px 200px', overflowY: 'auto' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>

          {/* Title */}
          <input
            type="text"
            value={draft.title}
            onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
            placeholder="Give this a working title…"
            style={{ width: '100%', padding: 0, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-serif)', fontSize: 40, fontWeight: 400, lineHeight: 1.15, color: '#1a1a1a', letterSpacing: '-0.005em', marginBottom: 12, boxSizing: 'border-box' }}
          />

          {/* Sage rule */}
          <div style={{ width: 36, height: 1, background: '#556b5b', opacity: 0.35, marginBottom: 32 }} />

          {/* Body — contentEditable */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={onBodyInput}
            className="write-body"
            data-placeholder="Begin where it feels right. You can shape it later."
            style={{ minHeight: 240, outline: 'none', fontFamily: 'var(--font-serif)', fontSize: 21, lineHeight: 1.75, color: '#1a1a1a', letterSpacing: '-0.002em', whiteSpace: 'pre-wrap' }}
          />

          {/* Word count */}
          <p style={{ marginTop: 28, fontSize: 12, color: 'rgba(26,26,26,0.35)', fontStyle: 'italic' }}>
            {wordCount === 0 ? 'Nothing yet. No rush.' : `${wordCount} word${wordCount === 1 ? '' : 's'}`}
          </p>
        </div>
      </div>

      {/* Selection toolbar */}
      {selectionPos && (
        <div style={{ position: 'fixed', top: selectionPos.top, left: selectionPos.left, transform: 'translate(-50%, -100%)', display: 'flex', gap: 2, padding: 4, background: '#1a1a1a', borderRadius: 8, boxShadow: '0 10px 30px -8px rgba(0,0,0,0.2)', zIndex: 50 }}>
          {[
            { cmd: 'bold', label: 'B', weight: 600, italic: false },
            { cmd: 'italic', label: 'I', weight: 400, italic: true },
          ].map(btn => (
            <button key={btn.cmd}
              onMouseDown={e => { e.preventDefault(); document.execCommand(btn.cmd, false); }}
              style={{ width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: '#fdfcfa', fontFamily: 'var(--font-serif)', fontSize: 14, fontWeight: btn.weight, fontStyle: btn.italic ? 'italic' : 'normal', borderRadius: 6, cursor: 'pointer' }}>
              {btn.label}
            </button>
          ))}
        </div>
      )}

      {/* Ask the agent — floating */}
      <div style={{ position: 'fixed', bottom: 80, right: 32, zIndex: 30, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>

        {/* Agent response */}
        {askResponse && (
          <div style={{ maxWidth: 340, background: '#fff', border: '1px solid #d4d2cc', borderRadius: 14, padding: '18px 20px', boxShadow: '0 10px 30px -8px rgba(0,0,0,0.08)', animation: 'kinloomFadeIn 240ms ease-out' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <RadialBullet size={11} />
              <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#556b5b' }}>The agent</span>
              <button onClick={() => setAskResponse(null)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', padding: 4, color: 'rgba(26,26,26,0.4)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
            </div>
            <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 16, lineHeight: 1.55, color: '#1a1a1a' }}>{askResponse}</p>
          </div>
        )}

        {/* Options panel */}
        {askOpen && !askResponse && (
          <div style={{ maxWidth: 300, background: '#fff', border: '1px solid #d4d2cc', borderRadius: 14, padding: 8, boxShadow: '0 10px 30px -8px rgba(0,0,0,0.08)', animation: 'kinloomFadeIn 200ms ease-out' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px 8px' }}>
              <RadialBullet size={11} />
              <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#556b5b' }}>The agent</span>
            </div>
            {ASK_OPTIONS.map(o => (
              <button key={o.id} onClick={() => askAgent(o.id)} disabled={askWorking}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', background: 'transparent', border: 'none', fontFamily: 'var(--font-serif)', fontSize: 15, color: 'rgba(26,26,26,0.75)', cursor: askWorking ? 'wait' : 'pointer', borderRadius: 8, fontStyle: 'italic', transition: 'background 150ms' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(85,107,91,0.06)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                {o.label}
              </button>
            ))}
            {askWorking && <p style={{ padding: '8px 12px', margin: 0, fontSize: 12, color: 'rgba(26,26,26,0.4)', fontStyle: 'italic' }}>Listening…</p>}
          </div>
        )}

        {/* Affordance button */}
        <button onClick={() => { setAskOpen(o => !o); setAskResponse(null); }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 16px 10px 12px', background: '#fff', border: '1px solid #d4d2cc', borderRadius: 9999, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 12px -2px rgba(0,0,0,0.06)', color: 'rgba(26,26,26,0.65)', fontSize: 13 }}>
          <span style={{ display: 'inline-flex', width: 28, height: 28, borderRadius: '50%', background: 'rgba(85,107,91,0.10)', alignItems: 'center', justifyContent: 'center' }}>
            <RadialBullet size={14} />
          </span>
          Ask the agent
        </button>
      </div>

      {/* Bottom bar */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, borderTop: '1px solid #d4d2cc', background: 'rgba(253,252,250,0.94)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', zIndex: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '14px 80px' }}>
          <button onClick={saveDraftAndExit} style={{ padding: '10px 18px', background: 'transparent', color: 'rgba(26,26,26,0.6)', border: '1px solid #d4d2cc', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>
            Save draft
          </button>
          <button onClick={() => setShowShaping(true)} disabled={!draft.body.trim()} style={{ padding: '10px 22px', background: '#556b5b', color: '#fdfcfa', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, fontFamily: 'inherit', cursor: draft.body.trim() ? 'pointer' : 'default', opacity: draft.body.trim() ? 1 : 0.4 }}>
            I&apos;m done
          </button>
        </div>
      </div>

      {/* Shaping overlay */}
      {showShaping && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,26,26,0.18)', backdropFilter: 'blur(2px)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'kinloomFadeIn 240ms ease-out' }}
          onClick={e => { if (e.target === e.currentTarget) setShowShaping(false); }}>
          <div style={{ width: '100%', maxWidth: 720, margin: '0 32px', marginBottom: 32, animation: 'kinloomSlideUp 320ms cubic-bezier(0.16,1,0.3,1)' }}>
            <ShapingCard
              variant="final"
              context={{ from: 'write', draft }}
              draft={draft}
              setDraft={setDraft}
              onSave={handleSaved}
              onKeepGoing={() => setShowShaping(false)}
              onStartOver={() => {
                setShowShaping(false);
                setDraft({ title: '', type: 'story', body: '' });
                if (editorRef.current) editorRef.current.innerText = '';
                setWordCount(0);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
