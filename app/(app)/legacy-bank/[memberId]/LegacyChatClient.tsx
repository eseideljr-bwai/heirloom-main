'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { FamilyMember } from '../../../../lib/server/queries';
import type { LibraryRow } from '../../../../lib/kinloom';

type Message = { role: 'user' | 'assistant'; text: string; sources?: string[] };

function ListeningOrb({ active = false }: { active?: boolean }) {
  return (
    <span className={`listening-orb${active ? ' is-active' : ''}`}>
      <svg viewBox="0 0 32 32" width="32" height="32">
        <defs>
          <radialGradient id="orb-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#c9a96e" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#556b5b" stopOpacity="0.5" />
          </radialGradient>
        </defs>
        {active && <circle cx="16" cy="16" r="14" fill="none" stroke="#556b5b" strokeWidth="0.8" opacity="0.3" />}
        <circle cx="16" cy="16" r="9" fill="url(#orb-grad)" opacity="0.85" />
        <circle cx="16" cy="16" r="4" fill="#fdfcfa" opacity="0.7" />
      </svg>
    </span>
  );
}

function suggestedQuestions(member: FamilyMember, kinlooms: LibraryRow[]): string[] {
  const firstName = member.name?.split(' ')[0] || 'them';
  const types = new Set(kinlooms.map(k => k.type_slug).filter(Boolean));
  const out: string[] = [];
  if (types.has('story')) out.push(`What's a story from ${firstName}'s life that shaped them?`);
  if (types.has('lesson')) out.push(`What life lessons did ${firstName} most want to pass on?`);
  if (types.has('belief')) out.push(`What did ${firstName} believe was most worth holding onto?`);
  if (types.has('message')) out.push(`What did ${firstName} want their family to remember?`);
  if (out.length < 2) out.push(`What did ${firstName} find most meaningful?`);
  return out.slice(0, 3);
}

export type LegacyChatClientProps = {
  member: FamilyMember;
  kinlooms: LibraryRow[];
};

export default function LegacyChatClient({ member, kinlooms }: LegacyChatClientProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const firstName = member.name?.split(' ')[0] || 'them';
  const suggestions = suggestedQuestions(member, kinlooms);

  async function send(text?: string) {
    const q = (text || input).trim();
    if (!q || sending) return;
    setInput('');
    setSending(true);
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    try {
      const res = await fetch('/api/legacy-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ memberId: member.member_id, question: q, sealed: !!member.deceased }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: data?.body || 'Something went quiet. Try again in a moment.',
        sources: Array.isArray(data?.sources) ? data.sources : [],
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'Something went quiet. The vault is here — try again in a moment.',
      }]);
    } finally {
      setSending(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    send();
  }

  return (
    <>
      {kinlooms.length > 0 && (
        <div className="chat-sources">
          <span className="chat-sources__label">Responding from:</span>
          {kinlooms.map(k => (
            <Link key={k.ulid} href={`/library/${k.ulid}`} className="chat-source-chip">
              {k.title || 'Untitled'}
            </Link>
          ))}
        </div>
      )}

      <div className="chat-thread">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p className="chat-empty__title">Ask {firstName} anything.</p>
            <p className="chat-empty__sub">Responses are grounded in what they chose to keep.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg chat-msg--${m.role}`}>
            {m.role === 'assistant' && <ListeningOrb />}
            <div className="chat-msg__bubble">
              <p>{m.text}</p>
              {m.sources && m.sources.length > 0 && (
                <p className="chat-msg__source">
                  Source{m.sources.length > 1 ? 's' : ''}: {m.sources.map(id => {
                    const k = kinlooms.find(x => x.ulid === id);
                    return k?.title || id;
                  }).join(' · ')}
                </p>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="chat-msg chat-msg--assistant chat-msg--typing">
            <ListeningOrb active />
            <span className="chat-typing">
              <span /><span /><span />
            </span>
          </div>
        )}
      </div>

      {messages.length <= 2 && suggestions.length > 0 && (
        <div className="chat-suggested">
          <p className="chat-suggested__label">Suggested questions</p>
          <div className="chat-suggested__row">
            {suggestions.map((q, i) => (
              <button key={i} type="button" onClick={() => send(q)} className="chip-button">{q}</button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="chat-input">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={`Ask ${firstName} something...`}
          disabled={sending}
          className="chat-input__field"
        />
        <button type="submit" disabled={sending || !input.trim()} className="btn-primary chat-input__send">
          Ask
        </button>
      </form>
      <p className="chat-input__note">
        Responses are grounded in stored kinloom content only &mdash; no invented facts, no impersonation.
      </p>
    </>
  );
}
