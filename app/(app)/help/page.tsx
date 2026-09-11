import Link from 'next/link';
import HelpFeedbackLink from './HelpFeedbackLink';

const SECTIONS = [
  {
    num: '01',
    title: 'Three ways to make a kinloom',
    body: 'Every kinloom starts the same way — with something you want your family to keep. How you get it down is up to you.',
    points: [
      'Write it. A prompt asks one question at a time and you shape the words.',
      'Talk it through. Speak your answers; what you say is kept the way you said it.',
      'Import what you have. Photos, letters, and documents become starting points you approve.',
    ],
    href: '/create/start',
    cta: 'Create a kinloom',
  },
  {
    num: '02',
    title: 'Where what you make lives',
    body: 'Nothing you preserve is public. A kinloom sits in your library until you decide to share it with your family space.',
    points: [
      'Your library holds everything you have written, spoken, or imported.',
      'Family kinlooms are the ones shared with the people you invite.',
    ],
    href: '/library',
    cta: 'Open your library',
  },
  {
    num: '03',
    title: 'Inviting your family',
    body: 'Kinloom works best with one other person in it. An invitation gives them their own space to preserve alongside yours — they are not just readers.',
    points: [
      'You choose who joins. The space stays invite-only.',
      'Their kinlooms sit next to yours, and neither of you can edit the other.',
    ],
    href: '/family/members',
    cta: 'Invite a family member',
  },
  {
    num: '04',
    title: 'What the Legacy Bank does',
    body: 'The Legacy Bank answers questions using only the kinlooms your family has actually created. No invented facts, no impersonation.',
    points: [
      'The more you preserve, the more it can answer.',
      'Every answer names the kinlooms it drew from.',
    ],
    href: '/legacy-bank',
    cta: 'Visit the Legacy Bank',
  },
];

export default function HelpPage() {
  return (
    <div className="help-page">
      <div className="help-page__header">
        <p className="eyebrow help-page__eyebrow">Getting Started</p>
        <h1 className="help-page__title">How Kinloom works.</h1>
        <p className="help-page__lede">
          Everything the onboarding showed you, kept in one place. Nothing here is required
          reading — return to whichever part you need.
        </p>
        <p className="help-page__aside">One kinloom is enough to begin. The rest follows.</p>
      </div>

      <div className="help-sections">
        {SECTIONS.map(s => (
          <section key={s.num} className="help-section" aria-labelledby={`help-section-${s.num}`}>
            <div className="help-section__head">
              <span className="help-section__num" aria-hidden="true">{s.num}</span>
              <h2 id={`help-section-${s.num}`} className="help-section__title">{s.title}</h2>
            </div>
            <p className="help-section__body">{s.body}</p>
            <ul className="help-section__points">
              {s.points.map(pt => (
                <li key={pt} className="help-section__point">
                  <span className="help-section__dot" aria-hidden="true" />
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
            <Link href={s.href} className="help-section__cta">{s.cta}</Link>
          </section>
        ))}
      </div>

      <div className="help-page__foot">
        <Link href="/welcome" className="help-page__foot-link">See the welcome screen again</Link>
        <HelpFeedbackLink />
      </div>
    </div>
  );
}
