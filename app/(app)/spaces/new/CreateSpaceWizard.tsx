'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiError } from '../../../../lib/api';
import { useActiveFamilySpace } from '../../../../lib/active-family-space';
import { useAuth } from '../../../../lib/auth-context';
import { canUpgradeToCreateSpace, createSpaceBlockedReason } from '../../../../lib/can-create-space';
import UpgradeToFamily from '../../../components/UpgradeToFamily';
import { createFamilySpace, inviteHomeToSpace } from '../../../../lib/space-manage';

// ─── Model ────────────────────────────────────────────────────────────

type Invite = { key: number; name: string; email: string };
type CleanInvite = { name: string; email: string };
type Failed = { email: string; reason: string };

/** The step list. The design's Shape step is left out, see page.tsx. */
const STEPS = ['Name', 'Homes', 'Review'] as const;
type Step = 0 | 1 | 2;

/** Daily invitation caps are 20 per account, shared with Home invitations. */
const MAX_INVITES = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createError(err: unknown): string {
  if (!(err instanceof ApiError)) return 'Couldn’t create the Family Space. Please try again.';
  if (err.status === 402) return 'Creating a Family Space needs the Family plan.';
  if (err.status === 403) return 'Only the owner or a co-owner of your Family Home can create a Family Space.';
  if (err.status === 422) return err.firstFieldError() ?? 'Check the name and try again.';
  if (err.status === 429) return 'You’re going too fast. Give it a moment and try again.';
  return 'Couldn’t create the Family Space. Please try again.';
}

function inviteError(err: unknown): string {
  if (!(err instanceof ApiError)) return 'It didn’t send.';
  if (err.status === 409) return 'This Family Space is full.';
  if (err.status === 422) return err.firstFieldError() ?? 'That email wasn’t accepted.';
  if (err.status === 429) return 'Too many invitations sent today. Try again tomorrow.';
  return 'It didn’t send.';
}

/** The letter for an avatar: "The Doyle Home" is a D, not a T. */
function initialOf(text: string): string {
  return (text.trim().replace(/^the\s+/i, '').charAt(0) || text.trim().charAt(0) || '?').toUpperCase();
}

/** Name ideas from the person's own name, so the chips are never invented. */
function nameIdeas(fullName: string): string[] {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return [];
  const surname = parts[parts.length - 1];
  return [`The ${surname}s`, `The ${surname} Family`];
}

// ─── Preview ──────────────────────────────────────────────────────────

/** "How it will appear": the Space as it will look, and who is in it. */
function Preview({
  name,
  homeName,
  invites,
}: {
  name: string;
  homeName: string;
  invites: CleanInvite[];
}) {
  return (
    <aside className="csw-preview" aria-label="How it will appear">
      <p className="csw-preview__label">How it will appear</p>
      <p className={`csw-preview__pill${name.trim() ? '' : ' is-empty'}`}>
        <span className="csw-preview__name">{name.trim() || 'Your Family Space'}</span>
        <span className="csw-preview__count">1 home</span>
      </p>

      <p className="csw-preview__label csw-preview__label--homes">Homes</p>
      <ul className="csw-preview__homes">
        <li>
          <span className="csw-avatar" aria-hidden="true">{initialOf(homeName)}</span>
          <span className="csw-preview__home">{homeName}</span>
          <span className="csw-preview__role">Owner</span>
        </li>
        {invites.map(i => (
          <li key={i.email}>
            <span className="csw-avatar csw-avatar--invited" aria-hidden="true">
              {initialOf(i.name || i.email)}
            </span>
            <span className="csw-preview__home">{i.name || i.email}</span>
            <span className="csw-preview__role">Invited</span>
          </li>
        ))}
      </ul>

      <p className="csw-preview__note">
        You will be its owner. You can hand that on, or share it, at any time.
      </p>
    </aside>
  );
}

// ─── Wizard ───────────────────────────────────────────────────────────

export default function CreateSpaceWizard() {
  const { user, refresh } = useAuth();
  const { familySpaces, setActiveFamilySpaceId } = useActiveFamilySpace();
  const router = useRouter();

  const [step, setStep] = useState<Step>(0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [invites, setInvites] = useState<Invite[]>([{ key: 0, name: '', email: '' }]);
  const nextKey = useRef(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** Set once the Space exists but some invitations did not go out. */
  const [partial, setPartial] = useState<{ id: string; name: string; failed: Failed[] } | null>(null);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const canCreate = user?.can_create_space ?? false;

  // Move focus to the new step's heading, and to the top of the page. Also
  // when an upgrade opens the form in place of the "can't create yet" screen.
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    window.scrollTo({ top: 0 });
    headingRef.current?.focus();
  }, [step, partial, canCreate]);

  const homeName = user?.home.name?.trim() || 'Your Family Home';
  const ideas = useMemo(
    () => nameIdeas(user?.display_name?.trim() || user?.name?.trim() || ''),
    [user],
  );

  // Invites as the API will get them: trimmed, lower case, no blanks, no repeats.
  const clean = useMemo<CleanInvite[]>(() => {
    const seen = new Set<string>();
    const out: CleanInvite[] = [];
    for (const i of invites) {
      const email = i.email.trim().toLowerCase();
      if (!email || !EMAIL_RE.test(email) || seen.has(email)) continue;
      seen.add(email);
      out.push({ name: i.name.trim(), email });
    }
    return out;
  }, [invites]);

  if (!user) return null;

  const blocked = createSpaceBlockedReason(user);
  const backHref = familySpaces.length > 0 ? '/spaces/tapestry' : '/home';
  const backLabel = familySpaces.length > 0 ? 'Back to Family Tapestry' : 'Back to your home';

  if (blocked) {
    return (
      <div className="csw">
        <Link href={backHref} className="csw__back">← {backLabel}</Link>
        <p className="eyebrow">Create a Family Space</p>
        <h1 className="csw__title">You can’t create a Family Space yet.</h1>
        <p className="csw__lead">{blocked}</p>
        {canUpgradeToCreateSpace(user) && <UpgradeToFamily />}
      </div>
    );
  }

  // ── Space exists, but some invitations did not go out ──
  if (partial) {
    return (
      <div className="csw">
        <p className="eyebrow">Create a Family Space</p>
        <h1 className="csw__title" ref={headingRef} tabIndex={-1}>
          {partial.name} is ready.
        </h1>
        <p className="csw__lead">
          {partial.failed.length === 1 ? 'One invitation' : `${partial.failed.length} invitations`} didn’t go out.
          You can send {partial.failed.length === 1 ? 'it' : 'them'} again from Manage Space.
        </p>
        <ul className="csw-failed">
          {partial.failed.map(f => (
            <li key={f.email}><strong>{f.email}</strong> — {f.reason}</li>
          ))}
        </ul>
        <div className="csw__actions">
          <button type="button" className="btn-save" onClick={() => router.push('/spaces/manage')}>
            Go to Manage Space
          </button>
        </div>
      </div>
    );
  }

  // ── Step validation ──
  function homesProblem(): string | null {
    const own = user!.email.trim().toLowerCase();
    for (const i of invites) {
      const email = i.email.trim();
      if (!email && i.name.trim()) return 'Add an email for each home you name.';
      if (email && !EMAIL_RE.test(email)) return `“${email}” doesn’t look like an email address.`;
      if (email.toLowerCase() === own) return 'That’s your own email. Your home is already in.';
    }
    return null;
  }

  function go(to: Step) {
    setError(null);
    setStep(to);
  }

  function onName(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Give the Family Space a name.'); return; }
    go(1);
  }

  function onHomes(e: React.FormEvent) {
    e.preventDefault();
    const problem = homesProblem();
    if (problem) { setError(problem); return; }
    go(2);
  }

  function skipHomes() {
    setInvites([{ key: nextKey.current++, name: '', email: '' }]);
    go(2);
  }

  async function onCreate() {
    if (busy) return;
    setBusy(true);
    setError(null);

    let space;
    try {
      space = await createFamilySpace(name, description);
    } catch (err) {
      setError(createError(err));
      setBusy(false);
      return;
    }

    // The Space exists, so invitations can go out. They don't depend on each
    // other, so they leave together.
    const results = await Promise.allSettled(clean.map(i => inviteHomeToSpace(space.id, i.email)));
    const failed: Failed[] = [];
    results.forEach((r, idx) => {
      if (r.status === 'rejected') failed.push({ email: clean[idx].email, reason: inviteError(r.reason) });
    });

    // In this order: the Space has to be in the client's copy of /me before
    // it can be the active one.
    try {
      await refresh();
      await setActiveFamilySpaceId(space.id);
    } catch {
      // The Space is made; the switcher catches up on the next load.
    }

    if (failed.length > 0) {
      setPartial({ id: space.id, name: space.name, failed });
      setBusy(false);
      return;
    }
    router.push('/spaces/tapestry?welcome=1');
  }

  const back = step === 0
    ? <Link href={backHref} className="csw__back">← {backLabel}</Link>
    : (
      <button type="button" className="csw__back" onClick={() => go((step - 1) as Step)} disabled={busy}>
        ← Back to {STEPS[step - 1].toLowerCase()}
      </button>
    );

  return (
    <div className="csw">
      {back}

      <ol className="create-steps csw__steps" aria-label="Progress">
        {STEPS.map((label, i) => {
          const state = i === step ? ' is-current' : i < step ? ' is-done' : '';
          return (
            <li key={label} className={`create-step${state}`} aria-current={i === step ? 'step' : undefined}>
              <span className="create-step__num" aria-hidden="true">{i < step ? '✓' : i + 1}</span>
              <span className="create-step__label">{label}</span>
            </li>
          );
        })}
      </ol>

      <div className="csw__grid">
        <div className="csw__main">
          <p className="eyebrow">Create a Family Space</p>

          {step === 0 && (
            <form onSubmit={onName} noValidate>
              <h1 className="csw__title" ref={headingRef} tabIndex={-1}>What is this family called?</h1>
              <p className="csw__lead">A Family Space is where your extended family’s story is kept together.</p>

              <div className="settings-fields">
                <div>
                  <label className="field-label" htmlFor="csw-name">Name</label>
                  <input
                    id="csw-name"
                    className="field-input csw__name"
                    value={name}
                    onChange={e => { setName(e.target.value); setError(null); }}
                    maxLength={255}
                    placeholder="The Okonjo Cousins"
                    autoComplete="off"
                    autoFocus
                  />
                  {ideas.length > 0 && (
                    <div className="csw__ideas">
                      {ideas.map(idea => (
                        <button
                          key={idea}
                          type="button"
                          className="csw__idea"
                          onClick={() => { setName(idea); setError(null); }}
                        >
                          {idea}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="csw__hint">Most families use their surname. You can change it any time.</p>
                </div>
                <div>
                  <label className="field-label" htmlFor="csw-description">
                    Who it gathers <span className="csw__optional">· optional</span>
                  </label>
                  <input
                    id="csw-description"
                    className="field-input"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    maxLength={2000}
                    placeholder="Every branch that ever ate at Mama Ada’s table."
                    autoComplete="off"
                  />
                </div>
              </div>

              {error && <p className="form-status form-status--error" role="alert">{error}</p>}

              <div className="csw__actions">
                <button type="submit" className="btn-save" disabled={!name.trim()}>Continue →</button>
              </div>
            </form>
          )}

          {step === 1 && (
            <form onSubmit={onHomes} noValidate>
              <h1 className="csw__title" ref={headingRef} tabIndex={-1}>Which homes belong here?</h1>
              <p className="csw__lead">
                Invite the homes of the people who belong in this family. They can accept whenever they are ready.
              </p>

              <p className="csw__group">Invite a home by email</p>
              <div className="csw-invites">
                {invites.map((inv, idx) => (
                  <div key={inv.key} className="csw-invite">
                    <input
                      className="field-input"
                      aria-label={`Home ${idx + 1} name (optional)`}
                      placeholder="Name (optional)"
                      value={inv.name}
                      onChange={e => {
                        const v = e.target.value;
                        setInvites(list => list.map(x => (x.key === inv.key ? { ...x, name: v } : x)));
                        setError(null);
                      }}
                      maxLength={120}
                    />
                    <input
                      className="field-input"
                      type="email"
                      aria-label={`Home ${idx + 1} email`}
                      placeholder="Email address"
                      value={inv.email}
                      onChange={e => {
                        const v = e.target.value;
                        setInvites(list => list.map(x => (x.key === inv.key ? { ...x, email: v } : x)));
                        setError(null);
                      }}
                      autoComplete="off"
                    />
                    {invites.length > 1 && (
                      <button
                        type="button"
                        className="csw-invite__remove"
                        aria-label={`Remove home ${idx + 1}`}
                        onClick={() => setInvites(list => list.filter(x => x.key !== inv.key))}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {invites.length < MAX_INVITES && (
                <button
                  type="button"
                  className="csw__link"
                  onClick={() => setInvites(list => [...list, { key: nextKey.current++, name: '', email: '' }])}
                >
                  + Add another
                </button>
              )}

              <p className="csw__hint csw__hint--note">
                You invite a home, not each person in it. Whoever owns that home decides who in it joins.
              </p>

              {error && <p className="form-status form-status--error" role="alert">{error}</p>}

              <div className="csw__actions">
                <button type="submit" className="btn-save">Continue →</button>
                <button type="button" className="csw__link" onClick={skipHomes}>Invite homes later</button>
              </div>
            </form>
          )}

          {step === 2 && (
            <div>
              <h1 className="csw__title" ref={headingRef} tabIndex={-1}>Ready to begin.</h1>
              <p className="csw__lead">Look it over. Everything here can be changed later.</p>

              <dl className="csw-review">
                <div>
                  <dt>Name</dt>
                  <dd>{name.trim()}</dd>
                  <dd className="csw-review__edit">
                    <button type="button" onClick={() => go(0)} disabled={busy}>Edit</button>
                  </dd>
                </div>
                {description.trim() && (
                  <div>
                    <dt>Who it gathers</dt>
                    <dd>{description.trim()}</dd>
                    <dd className="csw-review__edit">
                      <button type="button" onClick={() => go(0)} disabled={busy}>Edit</button>
                    </dd>
                  </div>
                )}
                <div>
                  <dt>Your home</dt>
                  <dd>{homeName}</dd>
                  <dd className="csw-review__edit" />
                </div>
                <div>
                  <dt>Invitations</dt>
                  <dd>
                    {clean.length === 0
                      ? 'None yet. You can invite homes from Manage Space.'
                      : clean.map(i => (i.name ? `${i.name} (${i.email})` : i.email)).join(', ')}
                  </dd>
                  <dd className="csw-review__edit">
                    <button type="button" onClick={() => go(1)} disabled={busy}>Edit</button>
                  </dd>
                </div>
                <div>
                  <dt>Owner</dt>
                  <dd>You</dd>
                  <dd className="csw-review__edit" />
                </div>
              </dl>

              <p className="csw__hint csw__hint--note">
                Nothing from your home appears here until you publish it onward. Every home that joins keeps
                its own members, its own seats and its own private pages.
              </p>

              {error && (
                <p className="form-status form-status--error" role="alert">
                  {error}
                  {error.includes('Family plan') && <> <Link href="/settings">Open Settings</Link></>}
                </p>
              )}

              <div className="csw__actions">
                <button type="button" className="btn-save" onClick={onCreate} disabled={busy}>
                  {busy ? 'Creating…' : `Create ${name.trim()}`}
                </button>
              </div>
            </div>
          )}
        </div>

        <Preview name={name} homeName={homeName} invites={clean} />
      </div>
    </div>
  );
}
