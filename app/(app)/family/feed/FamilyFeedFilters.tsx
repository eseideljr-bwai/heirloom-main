'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import DateRangeFields from '../../../components/DateRangeFields';

export type FeedAuthor = { memberId: string; name: string };

type Props = {
  authors: FeedAuthor[];
  member: string;
  from: string;
  to: string;
};

export default function FamilyFeedFilters({ authors, member, from, to }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function replace(mutate: (sp: URLSearchParams) => void) {
    const sp = new URLSearchParams(params.toString());
    mutate(sp);
    sp.delete('page');
    const search = sp.toString();
    startTransition(() =>
      router.replace(`${pathname}${search ? `?${search}` : ''}`, { scroll: false }),
    );
  }

  const isActiveMember = (id: string) => member.toLowerCase() === id.toLowerCase();

  function applyMember(id: string) {
    replace(sp => {
      if (!id || isActiveMember(id)) sp.delete('member');
      else sp.set('member', id);
    });
  }

  function applyDates(next: { from: string; to: string }) {
    replace(sp => {
      if (next.from) sp.set('from', next.from);
      else sp.delete('from');
      if (next.to) sp.set('to', next.to);
      else sp.delete('to');
    });
  }

  const hasFilters = Boolean(member || from || to);

  return (
    <div className={`filter-bar feed-filters${pending ? ' is-pending' : ''}`}>
      {authors.length > 1 && (
        <div className="library-filters">
          <button
            type="button"
            onClick={() => applyMember('')}
            className={`chip-button${!member ? ' is-active' : ''}`}
          >
            All members
          </button>
          {authors.map(a => (
            <button
              key={a.memberId}
              type="button"
              onClick={() => applyMember(a.memberId)}
              className={`chip-button${isActiveMember(a.memberId) ? ' is-active' : ''}`}
            >
              {a.name}
            </button>
          ))}
        </div>
      )}
      <DateRangeFields from={from} to={to} onChange={applyDates} />
      {hasFilters && (
        <Link href={pathname} className="filter-clear">Clear filters</Link>
      )}
    </div>
  );
}
