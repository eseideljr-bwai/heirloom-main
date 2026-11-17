import Link from 'next/link';
import { formatRelativeTime } from '../../../lib/kinloom';
import {
  conversationTitle,
  subjectOf,
  type LegacyBankConversation,
} from '../../../lib/legacy-bank';

export { conversationTitle };

export type ConversationRowProps = {
  conversation: LegacyBankConversation;
  href: string;
  /** Full history shows the message count; the recent block does not. */
  showMessageCount?: boolean;
};

function NeutralGlyph() {
  return (
    <span className="lb-history-row__avatar lb-history-row__avatar--neutral" aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <circle cx="8" cy="8" r="2" fill="currentColor" opacity="0.5" />
      </svg>
    </span>
  );
}

export default function ConversationRow({ conversation: c, href, showMessageCount }: ConversationRowProps) {
  const subject = subjectOf(c);
  const title = conversationTitle(c);

  const meta = [subject.isSpace ? `${subject.name} · Family Space` : subject.isYou ? 'Your own record' : subject.name];
  if (showMessageCount) {
    meta.push(`${c.message_count} message${c.message_count === 1 ? '' : 's'}`);
  }
  meta.push(c.last_message_at ? formatRelativeTime(c.last_message_at) : 'not started yet');

  return (
    <Link href={href} className="lb-history-row">
      {subject.initials ? (
        <span
          className="lb-history-row__avatar"
          style={{ background: `${subject.tone || '#a39376'}28`, color: subject.tone || '#556b5b' }}
        >
          {subject.initials}
        </span>
      ) : (
        <NeutralGlyph />
      )}
      <span className="lb-history-row__body">
        <span className="lb-history-row__title">{title}</span>
        <span className="lb-history-row__meta">{meta.join(' · ')}</span>
      </span>
      <span className="lb-history-row__cta">
        {c.can_ask ? 'Continue' : 'Read'}
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8 L13 8 M9 4 L13 8 L9 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
    </Link>
  );
}
