'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShapingCard, KinloomDraft, TalkTurn } from '../ShapingCard';

const OPENING_LINE = "What's on your mind?";

const FALLBACK_REPLIES = [
  "What stays with you most about that?",
  "Where were you, the first time you noticed it?",
  "Whose voice do you hear, when you think of it?",
  "What's the smallest piece of it that you remember clearly?",
];

function RadialBullet({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="10" cy="10" r="8" fill="none" stroke="#556b5b" strokeWidth="1" opacity="0.25" />
      <circle cx="10" cy="10" r="5" fill="none" stroke="#556b5b" strokeWidth="1" opacity="0.45" />
      <circle cx="10" cy="10" r="2.5" fill="#556b5b" opacity="0.75" />
    </svg>
  );
}

function StreamingCursor() {
  return (
    <span style={{ display: 'inline-block', width: '0.4em', height: '1em', marginLeft: 3, verticalAlign: '-0.12em', background: '#556b5b', opacity: 0.55, borderRadius: 1, animation: 'kinloomPulse 1.1s ease-in-out infinite' }} aria-hidden="true" />
  );
}

function ThinkingLine() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 15, color: 'rgba(26,26,26,0.4)', letterSpacing: '0.02em' }} aria-hidden="true">
      <span style={{ display: 'inline-block', width: 28, height: 1, background: 'rgba(26,26,26,0.3)', animation: 'kinloomPulse 1.6s ease-in-out infinite' }} />
      Listening
    </div>
  );
}

function AgentTurn({ text, streaming }: { text: string; streaming?: boolean }) {
  return (
    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, lineHeight: 1.55, color: '#1a1a1a', letterSpacing: '-0.005em' }}>
      {text}
      {streaming && <StreamingCursor />}
    </div>
  );
}

function UserTurn({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'stretch' }}>
      <span style={{ width: 2, background: 'rgba(85,107,91,0.35)', flexShrink: 0, borderRadius: 1 }} />
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, lineHeight: 1.6, color: 'rgba(26,26,26,0.65)', fontStyle: 'italic', paddingTop: 2, paddingBottom: 2 }}>
        {text}
      </div>
    </div>
  );
}

function ReadyPrompt({ onShape, onKeepGoing }: { onShape: () => void; onKeepGoing: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '24px 28px', background: 'rgba(85,107,91,0.05)', border: '1px solid rgba(85,107,91,0.20)', borderRadius: 14, animation: 'kinloomFadeIn 280ms ease-out' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <RadialBullet size={11} />
        <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#556b5b' }}>A moment to consider</span>
      </div>
      <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 18, lineHeight: 1.55, color: '#1a1a1a' }}>
        I think we have enough here for a real kinloom. Would you like to shape what we have, or is there more on your mind?
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={onShape} style={{ padding: '10px 20px', background: '#556b5b', color: '#fdfcfa', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}>
          Shape it now
        </button>
        <button onClick={onKeepGoing} style={{ padding: '10px 18px', background: 'transparent', color: 'rgba(26,26,26,0.65)', border: '1px solid #d4d2cc', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>
          There&apos;s more
        </button>
      </div>
    </div>
  );
}

export default function CreateTalkPage() {
  const router = useRouter();
  const [conversation, setConversation] = useState<TalkTurn[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [thinking, setThinking] = useState(false);
  const [ready, setReady] = useState(false);
  const [showShaping, setShowShaping] = useState(false);
  const [input, setInput] = useState('');
  const [draft, setDraft] = useState<KinloomDraft>({ title: '', type: 'story', body: '' });
  const scrollerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initRan = useRef(false);

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [conversation.length, streamingText, thinking, showShaping, ready]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 108) + 'px';
  }, [input]);

  function fakeStream(text: string, onDone: (text: string, readiness: string) => void, readiness: string) {
    const words = text.split(' ');
    let i = 0;
    setStreamingText('');
    const tick = () => {
      i++;
      setStreamingText(words.slice(0, i).join(' '));
      if (i >= words.length) {
        setTimeout(() => {
          setStreamingText('');
          onDone(text, readiness);
        }, 100);
        return;
      }
      setTimeout(tick, 35 + Math.random() * 55);
    };
    setTimeout(tick, 150);
  }

  async function respondTo(turns: TalkTurn[]) {
    setThinking(true);
    setReady(false);
    try {
      const res = await fetch('/api/kinloom-companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: turns, mode: 'talk' }),
      });
      const data = await res.json();
      setThinking(false);
      const replyText = data.reply || FALLBACK_REPLIES[turns.length % FALLBACK_REPLIES.length];
      const readiness = data.readiness || 'continuing';
      fakeStream(replyText, (text, r) => {
        setConversation(c => [...c, { role: 'agent', text }]);
        if (r === 'ready') {
          setTimeout(() => setReady(true), 350);
        }
      }, readiness);
    } catch {
      setThinking(false);
      const fallback = FALLBACK_REPLIES[turns.length % FALLBACK_REPLIES.length];
      fakeStream(fallback, (text) => {
        setConversation(c => [...c, { role: 'agent', text }]);
      }, 'continuing');
    }
  }

  useEffect(() => {
    if (initRan.current) return;
    initRan.current = true;

    let prefill = '';
    try { prefill = localStorage.getItem('kinloom-prefill') || ''; localStorage.removeItem('kinloom-prefill'); } catch {}

    if (prefill) {
      const userTurn: TalkTurn = { role: 'user', text: prefill };
      setConversation([userTurn]);
      respondTo([userTurn]);
    } else {
      // Show opener without API call
      fakeStream(OPENING_LINE, (text) => {
        setConversation([{ role: 'agent', text }]);
      }, 'continuing');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendTurn = () => {
    const text = input.trim();
    if (!text || thinking || streamingText) return;
    const next: TalkTurn[] = [...conversation, { role: 'user', text }];
    setConversation(next);
    setInput('');
    setReady(false);
    respondTo(next);
  };

  const handleSaved = (saved: KinloomDraft) => {
    try { localStorage.setItem('kinloom-saved', JSON.stringify(saved)); } catch {}
    router.push('/create/saved');
  };

  const handleSwitchToWrite = () => {
    try { localStorage.setItem('kinloom-draft', JSON.stringify(draft)); localStorage.setItem('kinloom-conversation', JSON.stringify(conversation)); } catch {}
    router.push('/create/write');
  };

  const userTurnsCount = conversation.filter(t => t.role === 'user').length;
  const hasContent = userTurnsCount >= 1;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fdfcfa' }}>

      {/* Top bar */}
      <div className="creation-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#556b5b' }}>Create a kinloom</span>
          <span style={{ color: 'rgba(26,26,26,0.3)' }}>›</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#1a1a1a', fontWeight: 500, fontSize: 12 }}>
            <RadialBullet size={9} />
            Talk
          </span>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <button className="topbar-link" onClick={() => router.push('/create')}>Save draft</button>
          <button className="topbar-link" onClick={handleSwitchToWrite}>Switch to Write</button>
        </div>
      </div>

      {/* Conversation */}
      <div ref={scrollerRef} style={{ flex: 1, overflowY: 'auto', padding: '56px 80px 32px', scrollBehavior: 'smooth' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 44 }}>

          {conversation.map((t, i) =>
            t.role === 'agent'
              ? <AgentTurn key={i} text={t.text} />
              : <UserTurn key={i} text={t.text} />
          )}

          {streamingText && <AgentTurn text={streamingText} streaming />}
          {thinking && !streamingText && <ThinkingLine />}

          {ready && !showShaping && !streamingText && !thinking && (
            <ReadyPrompt onShape={() => { setReady(false); setShowShaping(true); }} onKeepGoing={() => setReady(false)} />
          )}

          {hasContent && !ready && !streamingText && !thinking && !showShaping && (
            <div>
              <button onClick={() => setShowShaping(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'rgba(85,107,91,0.06)', border: '1px solid rgba(85,107,91,0.20)', borderRadius: 9999, fontSize: 13, color: '#556b5b', cursor: 'pointer', fontFamily: 'inherit', fontStyle: 'italic' }}>
                <RadialBullet size={10} />
                Shape this into a kinloom
              </button>
            </div>
          )}

          {showShaping && (
            <ShapingCard
              variant="final"
              context={{ from: 'talk', conversation }}
              draft={draft}
              setDraft={setDraft}
              onSave={handleSaved}
              onKeepGoing={() => setShowShaping(false)}
              onStartOver={() => {
                setShowShaping(false);
                setConversation([]);
                initRan.current = false;
                setTimeout(() => {
                  if (!initRan.current) {
                    initRan.current = true;
                    fakeStream(OPENING_LINE, (text) => {
                      setConversation([{ role: 'agent', text }]);
                    }, 'continuing');
                  }
                }, 50);
              }}
            />
          )}
        </div>
      </div>

      {/* Composer */}
      <div style={{ flexShrink: 0, borderTop: '1px solid #d4d2cc', background: 'rgba(253,252,250,0.94)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', position: 'sticky', bottom: 0, zIndex: 20, padding: '18px 48px 22px' }}>
        <form onSubmit={e => { e.preventDefault(); sendTurn(); }} style={{ maxWidth: 680, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'flex-end', padding: '12px 14px', background: '#fff', border: '1px solid #d4d2cc', borderRadius: 14, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendTurn(); } }}
            placeholder={userTurnsCount === 0 ? 'Start anywhere…' : 'Write your reply…'}
            rows={1}
            disabled={!!(thinking || streamingText)}
            style={{ flex: 1, resize: 'none', border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-serif)', fontSize: 16, lineHeight: 1.5, color: '#1a1a1a', minHeight: 24, maxHeight: 108, overflowY: 'auto', padding: '4px 0' }}
          />
          <button type="submit" disabled={!input.trim() || !!(thinking || streamingText)} style={{ padding: '8px 18px', fontSize: 14, fontWeight: 500, background: (input.trim() && !thinking && !streamingText) ? '#556b5b' : 'rgba(85,107,91,0.20)', color: '#fdfcfa', border: 'none', borderRadius: 9, cursor: (input.trim() && !thinking && !streamingText) ? 'pointer' : 'default', fontFamily: 'inherit', flexShrink: 0, transition: 'background 200ms' }}>
            Share
          </button>
        </form>
      </div>
    </div>
  );
}
