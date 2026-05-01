'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { KINLOOMS, MEMBER_MAP } from '../../../lib/mock-data';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  error?: boolean;
};

function ListeningOrb() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" style={{ flexShrink: 0 }} aria-hidden="true">
      <defs>
        <radialGradient id="orbCoreChat" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c9a96e" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#556b5b" stopOpacity="0.4" />
        </radialGradient>
      </defs>
      <circle cx="18" cy="18" r="14" fill="none" stroke="#556b5b" strokeWidth="0.6" opacity="0.3">
        <animate attributeName="r" values="12;16;12" dur="4s" repeatCount="indefinite" />
      </circle>
      <circle cx="18" cy="18" r="9" fill="url(#orbCoreChat)" opacity="0.85">
        <animate attributeName="opacity" values="0.7;1;0.7" dur="3.2s" repeatCount="indefinite" />
      </circle>
      <circle cx="18" cy="18" r="2" fill="#fdfcfa" opacity="0.9" />
    </svg>
  );
}

const STARTER_QUESTIONS_LIVING = [
  'What did your father teach you about staying?',
  'Tell me about Sunday bread.',
  'What do you believe about morning light?',
  'What would Eleanor say to Ivy on her tenth birthday?',
];

const STARTER_QUESTIONS_SEALED = [
  'What did they want me to know?',
  'What did they believe in?',
  'Tell me about the day I was born.',
  'What was the family tradition they hoped we would keep?',
];

function ConversationStarter({ sealed, onPick }: { sealed: boolean; onPick: (q: string) => void }) {
  const questions = sealed ? STARTER_QUESTIONS_SEALED : STARTER_QUESTIONS_LIVING;
  return (
    <div style={{ paddingTop: 24, paddingBottom: 24 }}>
      <p style={{ fontSize: 12, color: 'rgba(26,26,26,0.45)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 18px' }}>
        {sealed ? 'A descendant might ask' : 'A future kin might ask'}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {questions.map((q, i) => (
          <button
            key={i}
            onClick={() => onPick(q)}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.color = '#1a1a1a';
              (e.currentTarget as HTMLButtonElement).style.paddingLeft = '14px';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(26,26,26,0.65)';
              (e.currentTarget as HTMLButtonElement).style.paddingLeft = '4px';
            }}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '16px 4px',
              background: 'transparent', border: 'none',
              borderBottom: i === questions.length - 1 ? 'none' : '1px dashed #d4d2cc',
              cursor: 'pointer', fontFamily: 'var(--font-serif)',
              fontSize: 19, lineHeight: 1.4,
              color: 'rgba(26,26,26,0.65)', fontStyle: 'italic',
              transition: 'color 200ms, padding 200ms',
            }}
          >
            &ldquo;{q}&rdquo;
          </button>
        ))}
      </div>
      <p style={{ margin: '24px 0 0', fontSize: 12, color: 'rgba(26,26,26,0.45)', fontStyle: 'italic' }}>
        Or write your own, below.
      </p>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ maxWidth: '78%', padding: '14px 18px', background: '#f5f4f1', border: '1px solid #d4d2cc', borderRadius: '14px 14px 4px 14px', fontSize: 15, lineHeight: 1.55, color: '#1a1a1a' }}>
        {text}
      </div>
    </div>
  );
}

function AssistantTurn({ message }: { message: Message }) {
  const sources = (message.sources || [])
    .map(id => KINLOOMS.find(k => k.id === id))
    .filter((k): k is typeof KINLOOMS[number] => k !== undefined);

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      <div style={{ flexShrink: 0, marginTop: 4 }}>
        <ListeningOrb />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: 18, lineHeight: 1.65, color: message.error ? 'rgba(26,26,26,0.45)' : '#1a1a1a', margin: '0 0 14px', whiteSpace: 'pre-wrap', fontStyle: message.error ? 'italic' : 'normal' }}>
          {message.content}
        </p>
        {sources.length > 0 && (
          <div>
            <p style={{ fontSize: 10, color: 'rgba(26,26,26,0.45)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 8px' }}>
              Drawn from
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {sources.map(k => {
                const author = MEMBER_MAP[k.author];
                return (
                  <Link
                    key={k.id}
                    href={`/library/${k.id}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'rgba(85,107,91,0.06)', border: '1px solid rgba(85,107,91,0.18)', borderRadius: 9999, fontSize: 12, color: 'rgba(26,26,26,0.75)', textDecoration: 'none' }}
                  >
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#556b5b', flexShrink: 0 }} />
                    <span style={{ fontWeight: 500 }}>{k.title}</span>
                    <span style={{ color: 'rgba(26,26,26,0.45)' }}>· {author?.name?.split(' ')[0] || k.author}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <div style={{ flexShrink: 0 }}>
        <ListeningOrb />
      </div>
      <p style={{ margin: 0, fontSize: 14, color: 'rgba(26,26,26,0.45)', fontStyle: 'italic', fontFamily: 'var(--font-serif)' }}>
        Listening through your kinlooms…
      </p>
    </div>
  );
}

export default function LegacyChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [sealed, setSealed] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages, thinking]);

  const ask = async (question: string) => {
    if (!question.trim() || thinking) return;
    setMessages(m => [...m, { role: 'user', content: question }]);
    setInput('');
    setThinking(true);

    try {
      const res = await fetch('/api/legacy-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, sealed }),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      setMessages(msgs => [...msgs, {
        role: 'assistant',
        content: data.body,
        sources: data.sources,
      }]);
    } catch {
      setMessages(msgs => [...msgs, {
        role: 'assistant',
        content: 'Something went quiet. The vault is here — try again in a moment.',
        sources: [],
        error: true,
      }]);
    }
    setThinking(false);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      ask(input);
    }
  };

  return (
    <div style={{ padding: '32px 48px 0', maxWidth: 820, display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 32, flexShrink: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link href="/legacy-bank" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(26,26,26,0.6)', textDecoration: 'none', paddingBottom: 12 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M10 4 L6 8 L10 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to vault
          </Link>
          <p className="eyebrow" style={{ marginBottom: 10 }}>Try a conversation</p>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 36, lineHeight: 1.15, letterSpacing: '-0.005em', margin: '0 0 12px', color: '#1a1a1a' }}>
            What might they ask, one day?
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.65, color: 'rgba(26,26,26,0.65)', margin: 0, maxWidth: 560, fontFamily: 'var(--font-serif)' }}>
            This is a private rehearsal. Ask anything a future kin might — the answers are drawn only from what&apos;s been kept in your vault.
          </p>
        </div>

        {/* Sealed mode toggle */}
        <button
          onClick={() => setSealed(s => !s)}
          role="switch"
          aria-checked={sealed}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', border: '1px solid #d4d2cc', borderRadius: 9999, flexShrink: 0, background: sealed ? 'rgba(85,107,91,0.08)' : 'transparent', cursor: 'pointer', fontFamily: 'inherit', transition: 'background 200ms' }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: sealed ? '#556b5b' : '#d4d2cc', transition: 'background 200ms' }} />
          <span style={{ fontSize: 12, color: 'rgba(26,26,26,0.75)', whiteSpace: 'nowrap', fontStyle: 'italic', fontFamily: 'var(--font-serif)' }}>
            {sealed ? 'Sealed: speaking of you' : 'Living: speaking with you'}
          </span>
        </button>
      </div>

      {/* Conversation */}
      <div
        ref={scrollerRef}
        style={{ flex: 1, minHeight: 360, display: 'flex', flexDirection: 'column', gap: 32, paddingBottom: 24, overflowY: 'auto' }}
      >
        {messages.length === 0 && <ConversationStarter sealed={sealed} onPick={ask} />}
        {messages.map((m, i) =>
          m.role === 'user'
            ? <UserBubble key={i} text={m.content} />
            : <AssistantTurn key={i} message={m} />
        )}
        {thinking && <ThinkingIndicator />}
      </div>

      {/* Composer */}
      <div style={{ flexShrink: 0, background: '#fdfcfa', paddingTop: 16, paddingBottom: 32, borderTop: '1px solid #d4d2cc', position: 'sticky', bottom: 0 }}>
        <form
          onSubmit={e => { e.preventDefault(); ask(input); }}
          style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}
        >
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={sealed ? 'Ask what they would have said…' : 'Ask what your future kin might ask…'}
            rows={1}
            disabled={thinking}
            style={{ flex: 1, padding: '14px 16px', fontSize: 15, fontFamily: 'var(--font-serif)', lineHeight: 1.5, background: '#fff', border: '1px solid #d4d2cc', borderRadius: 12, resize: 'none', color: '#1a1a1a', outline: 'none', minHeight: 52, maxHeight: 160 }}
          />
          <button
            type="submit"
            disabled={!input.trim() || thinking}
            style={{ background: '#556b5b', color: '#fdfcfa', border: 'none', padding: '12px 22px', borderRadius: 8, fontSize: 14, fontWeight: 500, fontFamily: 'inherit', cursor: (!input.trim() || thinking) ? 'default' : 'pointer', opacity: (!input.trim() || thinking) ? 0.4 : 1, transition: 'opacity 200ms', flexShrink: 0 }}
          >
            Ask
          </button>
        </form>
        <p style={{ margin: '10px 4px 0', fontSize: 11, color: 'rgba(26,26,26,0.45)', fontStyle: 'italic', textAlign: 'center' }}>
          Drawn only from your kinlooms. Nothing here is shared.
        </p>
      </div>

    </div>
  );
}
