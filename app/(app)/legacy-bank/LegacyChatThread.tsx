'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ApiError } from '../../../lib/api';
import { apiErrorCode } from '../../../lib/invitations';
import {
  answerLabel,
  askQuestion,
  getConversationPage,
  startConversation,
  type LegacyBankMessage,
  type LegacyBankTarget,
  type LegacyBankVoice,
} from '../../../lib/legacy-bank';

export type LegacyChatThreadProps = {
  /** Who the next conversation would be about (used until one exists). */
  target: LegacyBankTarget;
  conversationId: string | null;
  /** First name of the person, or the Space's name. */
  subjectName: string;
  isSpace?: boolean;
  isYou?: boolean;
  /** Set by the server; labels answers ("From what Ray kept" / "In Ray's words"). */
  voice: LegacyBankVoice;
  /** Messages already saved, oldest first. */
  initialMessages?: LegacyBankMessage[];
  /** The next older page to fetch, or null when the whole conversation is shown. */
  olderPage?: number | null;
  /** False when asking would be refused (you can't see them anymore, or their bank is off). */
  canAsk?: boolean;
  /** Said under a disabled composer. */
  cannotAskText?: string;
  /** Shown while the thread is still short. */
  suggestedQuestions?: string[];
  /** Opening message in place of the empty state. */
  intro?: string;
  placeholder?: string;
};

/** The model's words as plain paragraphs: never Markdown, never HTML. */
function PlainText({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i} className="lb-msg__plain">{p}</p>
      ))}
    </>
  );
}

/** A reason in plain words for each way an ask can fail. */
function askFailure(err: unknown, name: string): { text: string; saved: boolean } {
  if (err instanceof ApiError) {
    const code = apiErrorCode(err);
    if (err.status === 503) {
      return { text: 'Kinloom couldn’t answer just now. Nothing was saved, so you can ask again.', saved: false };
    }
    if (code === 'legacy_bank_disabled') {
      return { text: `${name} has switched their Legacy Bank off, so it can’t answer right now.`, saved: false };
    }
    if (err.status === 403) {
      return { text: 'You can’t ask about this anymore. You can still read what was said.', saved: false };
    }
    if (err.status === 429) {
      return { text: 'That’s a lot of questions in a minute. Give it a moment, then ask again.', saved: false };
    }
    if (err.status === 422) {
      return { text: err.firstFieldError() || 'That question couldn’t be sent. Try rewording it.', saved: false };
    }
    if (err.status === 404) {
      return { text: 'This conversation isn’t available anymore. Start a new one.', saved: false };
    }
  }
  // A dropped connection or a proxy timeout: the answer may have been saved.
  return { text: 'We lost the connection. Checking whether your answer arrived…', saved: true };
}

export default function LegacyChatThread({
  target,
  conversationId: initialConversationId,
  subjectName,
  isSpace = false,
  isYou = false,
  voice,
  initialMessages,
  olderPage: initialOlderPage = null,
  canAsk = true,
  cannotAskText,
  suggestedQuestions,
  intro,
  placeholder,
}: LegacyChatThreadProps) {
  const [messages, setMessages] = useState<LegacyBankMessage[]>(initialMessages ?? []);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [slow, setSlow] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [olderPage, setOlderPage] = useState<number | null>(initialOlderPage);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const conversationIdRef = useRef<string | null>(initialConversationId);
  const logRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const label = answerLabel({ firstName: subjectName, isSpace, isYou }, voice);

  // The log is a fixed-height scroller, so a new turn would arrive below the
  // fold. Only follow the bottom when the person is already there, so loading
  // earlier messages doesn't yank the view.
  useEffect(() => {
    const el = logRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages, pendingQuestion, sending]);

  // After a while a spinner needs words: answers can take up to a minute.
  useEffect(() => {
    if (!sending) { setSlow(false); return; }
    const t = setTimeout(() => setSlow(true), 12000);
    return () => clearTimeout(t);
  }, [sending]);

  const merge = useCallback((incoming: LegacyBankMessage[]) => {
    setMessages(prev => {
      const seen = new Set(prev.map(m => m.id));
      const fresh = incoming.filter(m => !seen.has(m.id));
      if (fresh.length === 0) return prev;
      // Oldest first, by when each was saved; ids break ties, a question before its answer.
      return [...prev, ...fresh].sort((a, b) =>
        a.created_at === b.created_at
          ? (a.role === b.role ? a.id.localeCompare(b.id) : a.role === 'user' ? -1 : 1)
          : a.created_at.localeCompare(b.created_at));
    });
  }, []);

  async function loadOlder() {
    const id = conversationIdRef.current;
    if (!id || olderPage == null || loadingOlder) return;
    setLoadingOlder(true);
    stickToBottom.current = false;
    try {
      const res = await getConversationPage(id, olderPage);
      merge(res.data);
      setOlderPage(olderPage < res.meta.last_page ? olderPage + 1 : null);
    } catch {
      setNotice('Couldn’t load earlier messages. Try again.');
    } finally {
      setLoadingOlder(false);
    }
  }

  /** After a lost connection: did the answer get saved after all? */
  async function recover(question: string): Promise<boolean> {
    const id = conversationIdRef.current;
    if (!id) return false;
    try {
      const res = await getConversationPage(id, 1);
      const saved = res.data.some(m => m.role === 'user' && m.body === question);
      if (saved) merge(res.data);
      return saved;
    } catch {
      return false;
    }
  }

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || sending || !canAsk) return;
    stickToBottom.current = true;
    setInput('');
    setNotice(null);
    setSending(true);
    setPendingQuestion(q);
    try {
      let cid = conversationIdRef.current;
      if (!cid) {
        const convo = await startConversation(target);
        cid = convo.id;
        conversationIdRef.current = cid;
      }
      const { question, answer } = await askQuestion(cid, q);
      merge([question, answer]);
    } catch (err) {
      const fail = askFailure(err, subjectName);
      if (fail.saved) {
        setNotice(fail.text);
        if (await recover(q)) {
          setNotice(null);
        } else {
          setNotice('We lost the connection and the answer didn’t arrive. Nothing was saved, so you can ask again.');
          setInput(q);
        }
      } else {
        setNotice(fail.text);
        setInput(q); // the question comes back, so a retry is one tap
      }
    } finally {
      setPendingQuestion(null);
      setSending(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void send();
  }

  const empty = messages.length === 0 && !pendingQuestion;

  return (
    <div className="lb-chat">
      <div
        className="lb-chat__log"
        ref={logRef}
        onScroll={e => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        {olderPage != null && (
          <p className="lb-chat__older">
            <button type="button" className="lb-chat__older-btn" onClick={() => void loadOlder()} disabled={loadingOlder}>
              {loadingOlder ? 'Loading…' : 'Show earlier messages'}
            </button>
          </p>
        )}

        {empty && (
          intro ? (
            <div className="lb-msg lb-msg--assistant">
              <div className="lb-msg__bubble lb-msg__bubble--intro">
                <p className="lb-msg__who">Kinloom</p>
                <div className="lb-msg__text"><p>{intro}</p></div>
              </div>
            </div>
          ) : (
            <div className="lb-chat__empty">
              <p className="lb-chat__empty-title">
                {isYou ? 'Ask your own record anything.' : `Ask about ${subjectName}.`}
              </p>
              <p className="lb-chat__empty-sub">Answers come from what was chosen to keep.</p>
            </div>
          )
        )}

        {messages.map(m => (
          <div key={m.id} className={`lb-msg lb-msg--${m.role}`}>
            <div className="lb-msg__bubble">
              <p className="lb-msg__who">{m.role === 'user' ? 'You' : label}</p>
              <div className="lb-msg__text">
                {m.redacted || m.body == null ? (
                  <p className="lb-msg__redacted">
                    This answer used a kinloom you can no longer read, so it’s hidden.
                  </p>
                ) : (
                  <PlainText text={m.body} />
                )}
              </div>
              {m.role === 'assistant' && m.sources.length > 0 && (
                <div className="lb-msg__sources">
                  {m.sources.map(s => (
                    <Link key={s.id} href={`/library/${s.id}`} className="lb-msg__source">
                      {s.type?.label ? `${s.type.label} · ${s.title}` : s.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {pendingQuestion && (
          <div className="lb-msg lb-msg--user">
            <div className="lb-msg__bubble">
              <p className="lb-msg__who">You</p>
              <div className="lb-msg__text"><PlainText text={pendingQuestion} /></div>
            </div>
          </div>
        )}

        {sending && (
          <p className="lb-chat__busy" role="status" aria-live="polite">
            {slow
              ? 'Still reading. Longer questions can take up to a minute.'
              : isSpace
                ? `Reading what ${subjectName} holds…`
                : isYou
                  ? 'Reading your kinlooms…'
                  : `Reading ${subjectName}’s kinlooms…`}
          </p>
        )}
      </div>

      {notice && <p className="lb-chat__notice" role="alert">{notice}</p>}

      {canAsk && messages.length <= 2 && !sending && suggestedQuestions && suggestedQuestions.length > 0 && (
        <div className="lb-chat__asks">
          {suggestedQuestions.map((q, i) => (
            <button key={i} type="button" onClick={() => void send(q)} className="lb-chat__ask">
              {q}
            </button>
          ))}
        </div>
      )}

      {canAsk ? (
        <form onSubmit={onSubmit} className="lb-chat__composer">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={placeholder || (isSpace ? `Ask about ${subjectName}…` : isYou ? 'Ask your own record…' : `Ask about ${subjectName}…`)}
            disabled={sending}
            maxLength={2000}
            className="lb-chat__input"
            aria-label="Your question"
          />
          <button type="submit" disabled={sending || !input.trim()} className="lb-chat__send">
            {sending ? 'Asking…' : 'Ask'}
          </button>
        </form>
      ) : (
        <p className="lb-chat__note">{cannotAskText || 'This conversation can’t take new questions.'}</p>
      )}

      <p className="lb-chat__note">
        Grounded responses only. No invented facts. No impersonation.
        If it isn’t in a kinloom, Kinloom says so.
      </p>
    </div>
  );
}
