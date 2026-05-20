'use client';

import { useState, useEffect } from 'react';
import { KINLOOM_TYPES } from '../../lib/kinloom-types';

export type KinloomDraft = { title: string; type: string; body: string };
export type TalkTurn = { role: 'agent' | 'user'; text: string };

interface ShapingCardProps {
  variant: 'final' | 'interim';
  context: { from: 'talk' | 'write'; conversation?: TalkTurn[]; draft?: KinloomDraft };
  draft: KinloomDraft;
  setDraft: (d: KinloomDraft) => void;
  onSave: (d: KinloomDraft) => void;
  onKeepGoing: () => void;
  onStartOver?: () => void;
  onOpenInWrite?: (d: KinloomDraft) => void;
}

function RadialBullet({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="10" cy="10" r="8" fill="none" stroke="#556b5b" strokeWidth="1" opacity="0.25" />
      <circle cx="10" cy="10" r="5" fill="none" stroke="#556b5b" strokeWidth="1" opacity="0.45" />
      <circle cx="10" cy="10" r="2.5" fill="#556b5b" opacity="0.75" />
    </svg>
  );
}

function LoadingState({ variant }: { variant: 'final' | 'interim' }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #d4d2cc', borderRadius: 16, padding: '32px 28px', boxShadow: '0 10px 30px -8px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <RadialBullet size={12} />
        <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#556b5b' }}>
          {variant === 'interim' ? 'Shaping what you have…' : 'Shaping your kinloom…'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 5, alignItems: 'center', paddingLeft: 22 }}>
        {[0, 0.15, 0.30].map((delay, i) => (
          <span key={i} className="kinloom-loading-bar" style={{ animationDelay: `${delay}s` }} />
        ))}
        <span style={{ marginLeft: 10, fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14, color: 'rgba(26,26,26,0.45)' }}>
          Reading what you shared…
        </span>
      </div>
    </div>
  );
}

export function ShapingCard({
  variant,
  context,
  draft,
  setDraft,
  onSave,
  onKeepGoing,
  onStartOver,
  onOpenInWrite,
}: ShapingCardProps) {
  const [loading, setLoading] = useState(true);
  const [typeOpen, setTypeOpen] = useState(false);
  const [refineInput, setRefineInput] = useState('');
  const [refining, setRefining] = useState(false);
  const [splitKinlooms, setSplitKinlooms] = useState<{ title: string; type: string; summary: string }[] | null>(null);

  const isInterim = variant === 'interim';

  useEffect(() => {
    let cancelled = false;
    async function shape() {
      try {
        const res = await fetch('/api/kinloom-shaper', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: context.from,
            conversation: context.conversation,
            draft: context.draft || draft,
            mode: 'shape',
          }),
        });
        if (!res.ok) throw new Error('Shaper error');
        const data = await res.json();
        if (cancelled) return;

        if (data.kind === 'split' && data.kinlooms?.length > 1) {
          setSplitKinlooms(data.kinlooms);
        } else {
          setDraft({
            title: data.title || draft.title || '',
            type: data.type || draft.type || 'story',
            body: data.body || draft.body || '',
          });
        }
      } catch {
        // Fallback: keep existing draft
      }
      if (!cancelled) setLoading(false);
    }
    shape();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runRefine = async (instruction: string) => {
    if (!instruction.trim() || refining) return;
    setRefining(true);
    try {
      const res = await fetch('/api/kinloom-shaper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: context.from,
          conversation: context.conversation,
          draft: context.draft || draft,
          mode: 'refine',
          instruction,
          currentDraft: draft,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setDraft({
          title: data.title || draft.title,
          type: data.type || draft.type,
          body: data.body || draft.body,
        });
        setRefineInput('');
      }
    } catch {}
    setRefining(false);
  };

  if (loading) return <LoadingState variant={variant} />;

  // Split proposal
  if (splitKinlooms) {
    return (
      <div style={{ background: '#fff', border: '1px solid #d4d2cc', borderRadius: 16, padding: '28px', boxShadow: '0 10px 30px -8px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <RadialBullet size={12} />
          <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#556b5b' }}>
            A few kinlooms here
          </span>
        </div>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: 16, lineHeight: 1.6, color: 'rgba(26,26,26,0.7)', margin: '0 0 20px', fontStyle: 'italic' }}>
          It looks like you&apos;ve shared more than one thing. Which would you like to shape first?
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {splitKinlooms.map((k, i) => (
            <button key={i} onClick={() => { setSplitKinlooms(null); setDraft({ title: k.title, type: k.type, body: k.summary }); }}
              style={{ textAlign: 'left', padding: '14px 16px', border: '1px solid #d4d2cc', borderRadius: 10, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
              <p style={{ margin: '0 0 4px', fontFamily: 'var(--font-serif)', fontSize: 17, color: '#1a1a1a' }}>{k.title}</p>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(26,26,26,0.5)' }}>{k.summary}</p>
            </button>
          ))}
        </div>
        <button onClick={onKeepGoing} style={{ marginTop: 16, background: 'none', border: 'none', fontSize: 13, color: 'rgba(26,26,26,0.5)', cursor: 'pointer', fontFamily: 'inherit', fontStyle: 'italic' }}>
          Keep going instead
        </button>
      </div>
    );
  }

  const REFINE_CHIPS = ['Make it shorter', 'More specific detail', 'Warmer tone'];

  const primaryAction = isInterim
    ? { label: 'Open in writing surface', onClick: () => onOpenInWrite?.(draft) }
    : { label: 'Save to library', onClick: () => onSave(draft) };
  const secondaryAction = isInterim
    ? { label: 'Keep talking', onClick: onKeepGoing }
    : { label: 'Keep going', onClick: onKeepGoing };

  return (
    <div style={{ background: '#fff', border: '1px solid #d4d2cc', borderRadius: 16, boxShadow: '0 10px 30px -8px rgba(0,0,0,0.05)', overflow: 'visible', position: 'relative' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 28px 0' }}>
        <RadialBullet size={12} />
        <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#556b5b' }}>
          {isInterim ? "Here's where you are so far" : "Here's what we have so far"}
        </span>
      </div>

      {/* Editable fields */}
      <div style={{ padding: '18px 28px 8px', opacity: refining ? 0.5 : 1, transition: 'opacity 240ms', position: 'relative' }}>
        {/* Title */}
        <input
          value={draft.title}
          onChange={e => setDraft({ ...draft, title: e.target.value })}
          placeholder="A working title…"
          disabled={refining}
          style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 400, lineHeight: 1.15, letterSpacing: '-0.005em', color: '#1a1a1a', marginBottom: 14, boxSizing: 'border-box' }}
        />

        {/* Type pill */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 18 }}>
          <button
            onClick={() => setTypeOpen(o => !o)}
            disabled={refining}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 13px', background: 'rgba(85,107,91,0.10)', border: '1px solid rgba(85,107,91,0.20)', borderRadius: 9999, fontSize: 12, fontWeight: 500, color: '#556b5b', letterSpacing: '0.04em', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {KINLOOM_TYPES.find(t => t.slug === draft.type)?.label || 'Story'}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          {typeOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 80, background: '#fff', border: '1px solid #d4d2cc', borderRadius: 10, boxShadow: '0 10px 30px -8px rgba(0,0,0,0.1)', padding: 6, minWidth: 220 }}>
              {KINLOOM_TYPES.map(t => (
                <button key={t.slug} onClick={() => { setDraft({ ...draft, type: t.slug }); setTypeOpen(false); }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: draft.type === t.slug ? 'rgba(85,107,91,0.06)' : 'transparent', border: 'none', fontFamily: 'inherit', fontSize: 13, color: '#1a1a1a', cursor: 'pointer', borderRadius: 6 }}>
                  <div style={{ fontWeight: 500 }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: 'rgba(26,26,26,0.5)', marginTop: 2 }}>{t.definition}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <textarea
          value={draft.body}
          onChange={e => setDraft({ ...draft, body: e.target.value })}
          placeholder="The body of the kinloom…"
          rows={8}
          disabled={refining}
          style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-serif)', fontSize: 17, lineHeight: 1.7, color: '#1a1a1a', resize: 'vertical', boxSizing: 'border-box', padding: 0 }}
        />

        {/* Refining overlay */}
        {refining && (
          <div style={{ position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 18px', background: '#fff', border: '1px solid #d4d2cc', borderRadius: 9999, boxShadow: '0 4px 12px -2px rgba(0,0,0,0.06)', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 13, color: 'rgba(26,26,26,0.55)', whiteSpace: 'nowrap' }}>
            {[0, 0.15, 0.30].map((delay, i) => (
              <span key={i} className="kinloom-loading-bar" style={{ width: 2, height: 12, animationDelay: `${delay}s` }} />
            ))}
            Refining…
          </div>
        )}
      </div>

      {/* Advisory */}
      <p style={{ margin: '0 28px', paddingTop: 14, borderTop: '1px dashed #d4d2cc', fontSize: 13, fontStyle: 'italic', color: 'rgba(26,26,26,0.5)', fontFamily: 'var(--font-serif)' }}>
        {isInterim ? 'This is a draft from your conversation. Open it in the writing surface to develop it further.' : "Edit anything that doesn't feel right. This is your voice, not the agent's."}
      </p>

      {/* Refinement input */}
      <div style={{ padding: '14px 28px 16px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input
            value={refineInput}
            onChange={e => setRefineInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); runRefine(refineInput); } }}
            placeholder={'Ask to refine… ("Make it shorter", "More specific")'}
            disabled={refining}
            style={{ flex: 1, padding: '9px 14px', border: '1px solid #d4d2cc', borderRadius: 8, fontSize: 13, fontFamily: 'var(--font-serif)', fontStyle: 'italic', outline: 'none', background: '#fdfcfa', color: '#1a1a1a' }}
          />
          <button onClick={() => runRefine(refineInput)} disabled={!refineInput.trim() || refining}
            style={{ padding: '9px 16px', background: refineInput.trim() ? '#556b5b' : 'rgba(85,107,91,0.2)', color: '#fdfcfa', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, fontFamily: 'inherit', cursor: refineInput.trim() ? 'pointer' : 'default', transition: 'background 200ms' }}>
            Refine
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {REFINE_CHIPS.map(chip => (
            <button key={chip} onClick={() => runRefine(chip)} disabled={refining}
              style={{ padding: '5px 12px', borderRadius: 9999, border: '1px solid #d4d2cc', background: 'transparent', fontSize: 12, color: 'rgba(26,26,26,0.6)', cursor: 'pointer', fontFamily: 'inherit', fontStyle: 'italic', transition: 'border-color 150ms, color 150ms' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(85,107,91,0.4)'; (e.currentTarget as HTMLElement).style.color = '#556b5b'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#d4d2cc'; (e.currentTarget as HTMLElement).style.color = 'rgba(26,26,26,0.6)'; }}>
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 28px 24px', flexWrap: 'wrap' }}>
        <button onClick={primaryAction.onClick}
          style={{ padding: '11px 22px', background: '#556b5b', color: '#fdfcfa', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}>
          {primaryAction.label}
        </button>
        <button onClick={secondaryAction.onClick}
          style={{ padding: '11px 18px', background: 'transparent', color: 'rgba(26,26,26,0.65)', border: '1px solid #d4d2cc', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>
          {secondaryAction.label}
        </button>
        {!isInterim && onStartOver && (
          <button onClick={onStartOver}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 13, color: 'rgba(26,26,26,0.4)', cursor: 'pointer', fontFamily: 'inherit', fontStyle: 'italic' }}>
            Start over
          </button>
        )}
        {isInterim && (
          <button onClick={() => onSave(draft)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 13, color: 'rgba(26,26,26,0.4)', cursor: 'pointer', fontFamily: 'inherit', fontStyle: 'italic' }}>
            Save to library
          </button>
        )}
      </div>
    </div>
  );
}
