import Link from 'next/link';
import { requireActiveSpaceId } from '../../../../lib/server/auth';
import { getHome } from '../../../../lib/server/queries';

export const dynamic = 'force-dynamic';

/**
 * "Your First Kinloom" — the guided entry point from the welcome splash and
 * the getting-started checklist. Three ways to create, four starter prompts.
 * Everything here hands off to the existing creation flows; nothing is
 * created on this page.
 */

const MODES = [
  {
    href: '/create/type-grid',
    title: 'Write it',
    desc: 'Answer a few questions and shape the words yourself.',
    meta: 'Start from a prompt below',
    primary: true,
    icon: 'M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z',
  },
  {
    href: '/create/talk',
    title: 'Talk it through',
    desc: 'Speak your answers. Talk listens and keeps your words.',
    meta: 'About four minutes',
    primary: false,
    icon: 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3 M19 10v2a7 7 0 0 1-14 0v-2 M12 19v3',
  },
  {
    href: '/create/import',
    title: 'Import what you have',
    desc: 'Photos, letters, documents. Import finds where a story starts.',
    meta: 'Nothing is shared without you',
    primary: false,
    icon: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
  },
] as const;

const PROMPTS = [
  {
    type: 'Story',
    slug: 'story',
    title: 'A Person Who Shaped Me',
    desc: 'Tell a story about someone whose life influenced yours.',
    prompt: 'Who are you thinking about? What is something you remember clearly about them, and what did they teach you?',
  },
  {
    type: 'Story',
    slug: 'story',
    title: "A Memory I Don't Want to Lose",
    desc: 'Preserve a moment you want your family to remember.',
    prompt: "What is the moment you don't want to lose? Where were you, who was with you, and why does it still matter?",
  },
  {
    type: 'Lesson',
    slug: 'lesson',
    title: 'Something I Learned Along the Way',
    desc: 'Share wisdom or a lesson life taught you.',
    prompt: 'What did life teach you? How did you learn it, and who do you hope this reaches?',
  },
  {
    type: 'Tradition',
    slug: 'tradition',
    title: 'A Family Tradition Worth Carrying Forward',
    desc: 'Capture something your family does that you hope continues.',
    prompt: 'What is the tradition? Where did it come from, how does it actually go, and what would be lost if it stopped?',
  },
] as const;

function promptHref(p: (typeof PROMPTS)[number]): string {
  const params = new URLSearchParams({ title: p.title, prompt: p.prompt });
  return `/create/${p.slug}?${params.toString()}`;
}

export default async function CreateStartPage() {
  const familySpaceId = await requireActiveSpaceId();
  const { legacyBankProgress } = await getHome(familySpaceId);
  const hasKinlooms = legacyBankProgress.total_kinlooms > 0;

  return (
    <div className="start-page">
      <div className="start-page__top">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-kinloom.png" alt="Kinloom" className="start-page__logo" />
        <Link href="/home" className="start-page__not-now">Not now</Link>
      </div>

      <div className="start-page__header">
        <p className="eyebrow start-page__eyebrow">{hasKinlooms ? 'Ways To Create' : 'Your First Kinloom'}</p>
        <h1 className="start-page__title">Let&apos;s start with one story.</h1>
        <p className="start-page__lede">
          Think of a person, moment, lesson, or tradition you&apos;d want your family to remember.
        </p>
      </div>

      <div className="start-modes">
        {MODES.map(m => (
          <Link key={m.href} href={m.href} className={`start-mode${m.primary ? ' is-primary' : ''}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="start-mode__icon" aria-hidden="true">
              <path d={m.icon} />
            </svg>
            <span className="start-mode__title">{m.title}</span>
            <span className="start-mode__desc">{m.desc}</span>
            <span className="start-mode__meta">{m.meta}</span>
          </Link>
        ))}
      </div>
      <p className="start-page__note">
        All three end in the same place: your words, on a page you can edit before anything is preserved.
      </p>

      <div className="start-prompts">
        {PROMPTS.map(p => (
          <Link key={p.title} href={promptHref(p)} className="start-prompt">
            <span className="start-prompt__type">{p.type}</span>
            <span className="start-prompt__title">{p.title}</span>
            <span className="start-prompt__desc">{p.desc}</span>
          </Link>
        ))}
      </div>

      <div className="start-page__foot">
        <Link href="/create/type-grid" className="start-page__blank">I already know what I want to write</Link>
        <span className="start-page__foot-note">Any of these can become something else as you write.</span>
      </div>
    </div>
  );
}
