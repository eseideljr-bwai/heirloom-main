import Link from 'next/link';
import type { LegacyBankConversation } from '../../../lib/server/queries';
import { formatRelativeTime } from '../../../lib/kinloom';

export type ConversationRowProps = {
  conversation: LegacyBankConversation;
  href: string;
  /** Tone/initials for the subject, when known (from available_subjects). */
  subjectsById?: Record<string, { tone?: string | null; initials?: string | null }>;
  /** Full history includes message_count; the recent block does not. */
  showMessageCount?: boolean;
};

function initialsFromName(name: string | null): string {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p.charAt(0).toUpperCase())
    .join('');
}

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

export function conversationTitle(c: LegacyBankConversation): string {
  if (c.title) return c.title;
  if (c.subject_member_id) return `Reflections on ${c.subject_name}`;
  return 'Across the family';
}

export default function ConversationRow({ conversation: c, href, subjectsById, showMessageCount }: ConversationRowProps) {
  const subject = c.subject_member_id ? subjectsById?.[c.subject_member_id] : undefined;
  const title = conversationTitle(c);

  const metaParts = [c.subject_name || 'No single subject'];
  if (c.last_message_at) {
    metaParts.push(formatRelativeTime(c.last_message_at));
  } else {
    metaParts.push('not started yet');
  }
  if (showMessageCount && typeof c.message_count === 'number') {
    metaParts.splice(1, 0, `${c.message_count} message${c.message_count === 1 ? '' : 's'}`);
  }

  return (
    <Link href={href} className="lb-history-row">
      {c.subject_member_id ? (
        <span
          className="lb-history-row__avatar"
          style={{ background: (subject?.tone || '#a39376') + '28', color: subject?.tone || '#556b5b' }}
        >
          {subject?.initials || initialsFromName(c.subject_name)}
        </span>
      ) : (
        <NeutralGlyph />
      )}
      <span className="lb-history-row__body">
        <span className="lb-history-row__title">{title}</span>
        <span className="lb-history-row__meta">{metaParts.join(' · ')}</span>
      </span>
      <span className="lb-history-row__cta">
        Continue
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8 L13 8 M9 4 L13 8 L9 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
    </Link>
  );
}
