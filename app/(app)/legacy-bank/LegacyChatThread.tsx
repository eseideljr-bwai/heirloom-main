'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import type { LegacyBankMessage as ApiLegacyBankMessage, LegacyBankSource } from '../../../lib/server/queries';
import { askLegacyBank, createLegacyBankConversation, normalizeSources } from '../../../lib/legacy-bank';

type Message = { role: 'user' | 'assistant'; body: string; sources: LegacyBankSource[] };

export type LegacyChatThreadProps = {
  familySpaceId: string;
  conversationId: string | null;
  mode: 'living' | 'sealed';
  subjectMemberId: string | null;
  /** Used in copy: "Ask {subjectDisplayName} anything." / "Ask {subjectDisplayName} something..." */
  subjectDisplayName: string;
  initialMessages?: ApiLegacyBankMessage[];
  /** Only passed by the live chat, shown while the thread is still short. */
  suggestedQuestions?: string[];
  /**
   * Opening message shown in place of the empty state. The Family Legacy
   * Bank uses it to say up front what it will and will not read.
   */
  intro?: string;
  /** Overrides the composer placeholder. */
  placeholder?: string;
};

export default function LegacyChatThread({
  familySpaceId,
  conversationId: initialConversationId,
  mode,
  subjectMemberId,
  subjectDisplayName,
  initialMessages,
  suggestedQuestions,
  intro,
  placeholder,
}: LegacyChatThreadProps) {
  const [messages, setMessages] = useState<Message[]>(
    () => (initialMessages || []).map(m => ({ role: m.role, body: m.body, sources: normalizeSources(m.sources) })),
  );
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const conversationIdRef = useRef<string | null>(initialConversationId);
  const logRef = useRef<HTMLDivElement>(null);

  // The log is a fixed-height scroller in this design, so new turns would
  // otherwise arrive below the fold.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

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
    <div className="lb-chat">
      <div className="lb-chat__log" ref={logRef}>
        {messages.length === 0 && (
          intro ? (
            <div className="lb-msg lb-msg--assistant">
              <div className="lb-msg__bubble lb-msg__bubble--intro">
                <p className="lb-msg__who">Kinloom</p>
                <div className="lb-msg__text"><p>{intro}</p></div>
              </div>
            </div>
          ) : (
            <div className="lb-chat__empty">
              <p className="lb-chat__empty-title">Ask {subjectDisplayName} anything.</p>
              <p className="lb-chat__empty-sub">Responses are grounded in what was chosen to keep.</p>
            </div>
          )
        )}

        {messages.map((m, i) => (
          <div key={i} className={`lb-msg lb-msg--${m.role}`}>
            <div className="lb-msg__bubble">
              <p className="lb-msg__who">{m.role === 'user' ? 'You' : subjectDisplayName}</p>
              <div className="lb-msg__text">
                <ReactMarkdown>{m.body}</ReactMarkdown>
              </div>
              {m.role === 'assistant' && m.sources.length > 0 && (
                <div className="lb-msg__sources">
                  {m.sources.map(s => (
                    <Link key={s.id} href={`/library/${s.id}`} className="lb-msg__source">
                      {s.type ? `${s.type} · ${s.title}` : s.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {sending && (
          <p className="lb-chat__busy">Reading {subjectDisplayName}&rsquo;s kinlooms&hellip;</p>
        )}
      </div>

      {messages.length <= 2 && suggestedQuestions && suggestedQuestions.length > 0 && (
        <div className="lb-chat__asks">
          {suggestedQuestions.map((q, i) => (
            <button key={i} type="button" onClick={() => send(q)} className="lb-chat__ask" disabled={sending}>
              {q}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={onSubmit} className="lb-chat__composer">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={placeholder || `Ask ${subjectDisplayName} something…`}
          disabled={sending}
          className="lb-chat__input"
        />
        <button type="submit" disabled={sending || !input.trim()} className="lb-chat__send">
          Ask
        </button>
      </form>

      <p className="lb-chat__note">
        Grounded responses only. No invented facts. No impersonation.
        If it is not in a kinloom, Kinloom says so.
      </p>
    </div>
  );
}
