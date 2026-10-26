import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireHome } from '../../../../lib/server/auth';
import { serverKinloomApi } from '../../../../lib/server/kinloom-api';
import { parsePageParam } from '../../../../lib/pagination';
import Pagination from '../../../components/Pagination';
import ConversationRow from '../ConversationRow';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

export default async function LegacyBankHistoryPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  await requireHome();
  const requested = parsePageParam(searchParams.page);

  const res = await serverKinloomApi.get('/legacy-bank/conversations', {
    query: { page: requested, per_page: PAGE_SIZE },
  });
  // A page past the end (a stale link, or conversations since removed) goes to the last one.
  if (res.data.length === 0 && requested > 1) {
    redirect(res.meta.last_page > 1 ? `/legacy-bank/history?page=${res.meta.last_page}` : '/legacy-bank/history');
  }
  const conversations = res.data;

  return (
    <div className="lb-chat-try">
      <div className="lb-chat-try__back">
        <Link href="/legacy-bank" className="link-back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          Back to vault
        </Link>
      </div>

      <p className="eyebrow lb-chat-try__eyebrow">Legacy Bank</p>
      <h1 className="lb-chat-try__title">Every conversation you’ve kept.</h1>

      {conversations.length === 0 ? (
        <div className="empty-card">
          <p className="empty-card__text">Nothing kept here yet.</p>
          <p className="empty-card__sub">Start a conversation with a family member and it will appear here. Only you can see your conversations.</p>
          <Link href="/legacy-bank/chat" className="btn-primary btn-primary--lg">Try a conversation</Link>
        </div>
      ) : (
        <>
          <div className="lb-history-list">
            {conversations.map(c => (
              <ConversationRow key={c.id} conversation={c} href={`/legacy-bank/history/${c.id}`} showMessageCount />
            ))}
          </div>
          <Pagination
            page={res.meta.page}
            totalPages={res.meta.last_page}
            basePath="/legacy-bank/history"
            totalItems={res.meta.total}
            pageSize={PAGE_SIZE}
            label="Conversations"
          />
        </>
      )}
    </div>
  );
}
