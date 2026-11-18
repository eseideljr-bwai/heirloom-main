import Link from 'next/link';

/**
 * Your own Legacy Bank while you have switched it off
 * (`legacy_bank_enabled: false` in /me/settings). Nothing here can ask:
 * the composer is shown only so you can see what is unavailable.
 */
export default function LegacyBankOff({ personId }: { personId: string }) {
  return (
    <div className="lb-grid">
      <section className="lb-chat lb-off" aria-labelledby="lb-off-title">
        <span className="lb-off__icon" aria-hidden="true">
          {/* Lucide "lock" */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </span>

        <h2 id="lb-off-title" className="lb-off__title">Your Legacy Bank is turned off.</h2>
        <p className="lb-off__text">
          While it is off, no one can ask questions about what you have written — not you, and not
          your family. Your kinlooms stay exactly where they are, in your vault.
        </p>
        <p className="lb-off__text lb-off__text--strong">
          To turn it on, open Settings from your photo at the top right, choose Privacy &amp;
          permissions, and switch on “Let my family ask about me” under Legacy Bank.
        </p>

        <div className="lb-off__actions">
          <Link href="/settings/privacy#sec-bank" className="btn btn-primary">
            Open Settings
          </Link>
          <Link href={`/portrait/${personId}`} className="lb-off__back">
            Back to My Portrait →
          </Link>
        </div>

        <div className="lb-off__unavailable">
          <p className="lb-off__label" id="lb-off-unavailable">Unavailable while off</p>
          <div className="lb-chat__composer lb-off__composer" aria-describedby="lb-off-unavailable">
            <input
              className="lb-chat__input"
              type="text"
              placeholder="Ask about something you wrote"
              aria-label="Ask about something you wrote"
              disabled
            />
            <button type="button" className="lb-off__ask" disabled>
              Ask
            </button>
          </div>
        </div>
      </section>

      <aside className="lb-ground lb-off__when">
        <p className="lb-off__label">When it is on</p>
        <ol className="lb-off__list">
          <li>
            Answers come only from your own kinlooms. Nothing is invented, and it speaks as you
            only if you choose “As me.”
          </li>
          <li>
            While you are living, only you can ask it about your whole vault. Others reach only
            what you published to them.
          </li>
          <li>You can switch it off again at any time. Your kinlooms never move.</li>
        </ol>
      </aside>
    </div>
  );
}
