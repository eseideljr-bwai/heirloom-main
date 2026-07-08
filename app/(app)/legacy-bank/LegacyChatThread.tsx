'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import type { LibraryRow } from '../../../lib/kinloom';
import type { LegacyBankMessage as ApiLegacyBankMessage, LegacyBankSource } from '../../../lib/server/queries';
import { askLegacyBank, createLegacyBankConversation, normalizeSources } from '../../../lib/legacy-bank';

type Message = { role: 'user' | 'assistant'; body: string; sources: LegacyBankSource[] };

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

function SourceChips({ sources }: { sources: LegacyBankSource[] }) {
  if (sources.length === 0) return null;
  return (
    <p className="chat-msg__sources">
      {sources.map(s => (
        <Link key={s.id} href={`/library/${s.id}`} className="chat-source-chip">
          {s.type ? `${s.type} · ${s.title}` : s.title}
        </Link>
      ))}
    </p>
  );
}

export type LegacyChatThreadProps = {
  familySpaceId: string;
  conversationId: string | null;
  mode: 'living' | 'sealed';
  subjectMemberId: string | null;
  /** Used in copy: "Ask {subjectDisplayName} anything." / "Ask {subjectDisplayName} something..." */
  subjectDisplayName: string;
  initialMessages?: ApiLegacyBankMessage[];
  /** Only passed by the live per-member chat — its presence is what shows the "Responding from" corpus cloud. */
  corpusKinlooms?: LibraryRow[];
  /** Only passed by the live chat, shown while the thread is still short. */
  suggestedQuestions?: string[];
};

export default function LegacyChatThread({
  familySpaceId,
  conversationId: initialConversationId,
  mode,
  subjectMemberId,
  subjectDisplayName,
  initialMessages,
  corpusKinlooms,
  suggestedQuestions,
}: LegacyChatThreadProps) {
  const [messages, setMessages] = useState<Message[]>(
    () => (initialMessages || []).map(m => ({ role: m.role, body: m.body, sources: normalizeSources(m.sources) })),
  );
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const conversationIdRef = useRef<string | null>(initialConversationId);

  async function send(text?: string) {
    const q = (text || input).trim();
    if (!q || sending) return;
    setInput('');
    setSending(true);
    setMessages(prev => [...prev, { role: 'user', body: q, sources: [] }]);
    try {
      let cid = conversationIdRef.current;
      if (!cid) {
        const convo = await createLegacyBankConversation(familySpaceId, {
          mode,
          subject_member_id: subjectMemberId,
        });
        cid = convo.ulid;
        conversationIdRef.current = cid;
      }
      const assistant = await askLegacyBank(familySpaceId, cid, q);
      setMessages(prev => [...prev, {
        role: 'assistant',
        body: assistant.body || 'Something went quiet. Try again in a moment.',
        sources: normalizeSources(assistant.sources),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        body: 'Something went quiet. The vault is here — try again in a moment.',
        sources: [],
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
      {corpusKinlooms && corpusKinlooms.length > 0 && (
        <div className="chat-sources">
          <span className="chat-sources__label">Responding from:</span>
          {corpusKinlooms.map(k => (
            <Link key={k.ulid} href={`/library/${k.ulid}`} className="chat-source-chip">
              {k.title || 'Untitled'}
            </Link>
          ))}
        </div>
      )}

      <div className="chat-thread">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p className="chat-empty__title">Ask {subjectDisplayName} anything.</p>
            <p className="chat-empty__sub">Responses are grounded in what was chosen to keep.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg chat-msg--${m.role}`}>
            {m.role === 'assistant' && <ListeningOrb />}
            <div className="chat-msg__bubble">
              <ReactMarkdown>{m.body}</ReactMarkdown>
              {m.role === 'assistant' && <SourceChips sources={m.sources} />}
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

      {messages.length <= 2 && suggestedQuestions && suggestedQuestions.length > 0 && (
        <div className="chat-suggested">
          <p className="chat-suggested__label">Suggested questions</p>
          <div className="chat-suggested__row">
            {suggestedQuestions.map((q, i) => (
              <button key={i} type="button" onClick={() => send(q)} className="chip-button">{q}</button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="chat-input">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={`Ask ${subjectDisplayName} something...`}
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
