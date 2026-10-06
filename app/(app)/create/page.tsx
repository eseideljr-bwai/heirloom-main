import Link from 'next/link';
import CreateSteps from '../../components/CreateSteps';
import CreateModeChooser from './CreateModeChooser';

export const dynamic = 'force-dynamic';

/**
 * Where the flow was entered from, so the back link names a real place
 * rather than a generic "Back". Passed as `?from=`; anything unknown
 * falls back to My Home, as the design does.
 */
const ORIGINS: Record<string, { label: string; href: string }> = {
  home:     { label: 'My Home',         href: '/home' },
  vault:    { label: 'My Vault',        href: '/vault' },
  library:  { label: 'Our Library',     href: '/library' },
  tapestry: { label: 'Family Tapestry', href: '/spaces/tapestry' },
  tree:     { label: 'Family Tree',     href: '/spaces/tree' },
};

export default function CreatePage({ searchParams }: { searchParams?: { from?: string } }) {
  const origin = ORIGINS[searchParams?.from ?? ''] ?? ORIGINS.home;

  return (
    <div className="create-page">
      <Link href={origin.href} className="create-page__back">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>
        Back to {origin.label}
      </Link>

      <CreateSteps active={0} />

      <p className="eyebrow create-page__eyebrow">Create a kinloom</p>
      <h1 className="create-page__title">How would you like to begin?</h1>
      <p className="create-page__lead">However it starts, it ends up in your words.</p>

      <CreateModeChooser />
    </div>
  );
}
