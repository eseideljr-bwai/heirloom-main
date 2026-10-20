'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export type Candidate = {
  id: string;
  title: string;
  by: string;
  kind: 'photograph' | 'voice' | 'written';
  image: string | null;
};

type Choice = { hero: string | null; quote: string | null; voice: string | null; lately: string[] };

const EMPTY: Choice = { hero: null, quote: null, voice: null, lately: [] };

/**
 * Nothing in the API stores a Home's featured content, so selections live
 * in this browser only — the same stand-in the prototype uses. When the
 * backend lands, `load`/`save` are the two functions that change.
 */
function load(key: string): Choice {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<Choice>) };
  } catch {
    return EMPTY;
  }
}

function save(key: string, next: Choice) {
  try {
    window.localStorage.setItem(key, JSON.stringify(next));
  } catch {
    /* private window, blocked storage — the page still works, it just forgets */
  }
}

const LATELY_MAX = 3;

function label(c: Candidate): string {
  if (c.kind === 'voice') return 'Voice';
  if (c.kind === 'photograph') return 'Photograph';
  return 'Written';
}

function Card({
  c,
  on,
  disabled,
  onToggle,
}: {
  c: Candidate;
  on: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={`feat-card${on ? ' is-on' : ''}`}
      aria-pressed={on}
      disabled={disabled}
      onClick={onToggle}
    >
      <span className="feat-card__mark" aria-hidden="true">{on ? '✓' : ''}</span>
      {c.image ? (
        <span className="feat-card__img" style={{ backgroundImage: `url(${c.image})` }} />
      ) : (
        <span className="feat-card__img feat-card__img--none" />
      )}
      <span className="feat-card__body">
        <span className="feat-card__kind">{label(c)}</span>
        <span className="feat-card__title">{c.title}</span>
        {c.by && <span className="feat-card__by">{c.by}</span>}
      </span>
    </button>
  );
}

function Section({
  n,
  title,
  sub,
  children,
  note,
}: {
  n: number;
  title: string;
  sub: string;
  children: React.ReactNode;
  note?: React.ReactNode;
}) {
  return (
    <section className="feat-section">
      <div className="feat-section__head">
        <span className="feat-section__n">{n}</span>
        <div>
          <h2 className="feat-section__title">{title}</h2>
          <p className="feat-section__sub">{sub}</p>
        </div>
      </div>
      {note}
      <div className="feat-grid">{children}</div>
    </section>
  );
}

export default function FeaturedClient({
  candidates,
  homeName,
  storageKey = 'kinloom-featured-home-v1',
}: {
  candidates: Candidate[];
  /** The container being curated — a Home, or a Family Space. */
  homeName: string;
  storageKey?: string;
}) {
  const [choice, setChoice] = useState<Choice>(EMPTY);
  const [ready, setReady] = useState(false);

  // localStorage is read after mount so the server and first client render
  // agree; otherwise every selection would be a hydration mismatch.
  useEffect(() => {
    setChoice(load(storageKey));
    setReady(true);
  }, [storageKey]);

  function set(next: Choice) {
    setChoice(next);
    save(storageKey, next);
  }

  const pickOne = (field: 'hero' | 'quote' | 'voice', id: string) =>
    set({ ...choice, [field]: choice[field] === id ? null : id });

  const toggleLately = (id: string) => {
    const has = choice.lately.includes(id);
    if (!has && choice.lately.length >= LATELY_MAX) return;
    set({
      ...choice,
      lately: has ? choice.lately.filter(x => x !== id) : [...choice.lately, id],
    });
  };

  const byId = (id: string | null) => candidates.find(c => c.id === id) || null;

  // Offer candidates by what they ARE, not by whether a thumbnail could be
  // resolved. The list payload carries has_photo but no media url, so
  // filtering on `image` hid every photograph that exists.
  const withMedia = candidates.filter(c => c.kind === 'photograph');
  const voices = candidates.filter(c => c.kind === 'voice');

  const hero = byId(choice.hero);
  const quote = byId(choice.quote);
  const voice = byId(choice.voice);
  const lately = choice.lately.map(byId).filter((c): c is Candidate => c !== null);
  const nothingChosen = !hero && !quote && !voice && lately.length === 0;

  if (candidates.length === 0) {
    return (
      <div className="empty-card">
        <p className="empty-card__text">
          Nothing has been published to {homeName} yet, so there is nothing to feature.
        </p>
        <Link href="/create?from=home" className="empty-card__cta">Write the first one →</Link>
      </div>
    );
  }

  return (
    <div className="feat-layout">
      <div className={ready ? undefined : 'feat-pending'}>
        <Section
          n={1}
          title="What opens the page"
          sub="The large film or photograph beside your home’s name."
        >
          {withMedia.length === 0 ? (
            <p className="feat-grid__empty">
              Nothing published to this home carries a photograph or film yet.
            </p>
          ) : (
            withMedia.map(c => (
              <Card key={c.id} c={c} on={choice.hero === c.id} onToggle={() => pickOne('hero', c.id)} />
            ))
          )}
        </Section>

        <Section
          n={2}
          title="The words your home returns to"
          sub="One quotation, set large, with the person who said it."
          note={
            <p
              className="feat-section__flag no-api"
              data-api-scope="in"
              data-api-note={"GET /family-homes/{homeId}/featured/candidates?slot=quote\n→ data[] · HomeFeaturedCandidate, each with featured_quote (string | null) and is_picked\nThe API filters per slot, so this list no longer needs every kinloom — and featured_quote gives the words to print on the card."}
            >
              Every kinloom is listed here. Once kinlooms can carry a quotation,
              only those will appear.
            </p>
          }
        >
          {candidates.map(c => (
            <Card key={c.id} c={c} on={choice.quote === c.id} onToggle={() => pickOne('quote', c.id)} />
          ))}
        </Section>

        <Section
          n={3}
          title="A voice in the family"
          sub="One recording, shown with the face of the person speaking."
        >
          {voices.length === 0 ? (
            <p className="feat-grid__empty">No recordings have been published here yet.</p>
          ) : (
            voices.map(c => (
              <Card key={c.id} c={c} on={choice.voice === c.id} onToggle={() => pickOne('voice', c.id)} />
            ))
          )}
        </Section>

        <Section
          n={4}
          title="Lately in the family"
          sub={`Choose up to ${LATELY_MAX}. Kinloom sizes and orders them.`}
        >
          {candidates.map(c => {
            const on = choice.lately.includes(c.id);
            return (
              <Card
                key={c.id}
                c={c}
                on={on}
                disabled={!on && choice.lately.length >= LATELY_MAX}
                onToggle={() => toggleLately(c.id)}
              />
            );
          })}
        </Section>
      </div>

      <aside className="feat-preview">
        <p className="feat-preview__label">How Home will open</p>

        {hero?.image ? (
          <span className="feat-preview__hero" style={{ backgroundImage: `url(${hero.image})` }} />
        ) : (
          <span className="feat-preview__hero feat-preview__hero--none" />
        )}
        {hero && <p className="feat-preview__title">{hero.title}</p>}

        {quote && (
          <p className="feat-preview__quote">
            “{quote.title}” <span className="feat-preview__quote-by">— {quote.by}</span>
          </p>
        )}

        {lately.length > 0 && (
          <div className="feat-preview__strip">
            {lately.map(c => (
              <span key={c.id} className="feat-preview__thumb">
                <span
                  className="feat-preview__thumb-img"
                  style={c.image ? { backgroundImage: `url(${c.image})` } : undefined}
                />
                <span className="feat-preview__thumb-cap">{c.title}</span>
              </span>
            ))}
          </div>
        )}

        {voice && <p className="feat-preview__voice">Voice · {voice.title}</p>}

        <p className="feat-preview__note">
          You choose what matters. Kinloom decides the sizes, the order and the spacing.
        </p>

        {nothingChosen && (
          <p className="feat-preview__fallback">
            Nothing chosen yet — Kinloom is showing what was published most recently.
          </p>
        )}

        <Link href="/home" className="feat-preview__cta">See it on Home →</Link>

        <p
          className="feat-preview__warn no-api"
              data-api-scope="in"
              data-api-note={"GET /family-homes/{homeId}/featured → HomeFeaturedEditor\n  hero | quote | voice | lately · each a slot of { max, picks[], automatic[] }\n  is_automatic · true when nothing is picked; automatic[] is what Kinloom shows instead\nCandidates per slot: GET .../featured/candidates?slot=hero|quote|voice|lately&q=&page=\nSave: PUT .../featured with { hero: Id[], quote: Id[], voice: Id[], lately: Id[] }\nRevert to automatic: DELETE .../featured\nReplaces localStorage entirely — delete load/save in FeaturedClient.tsx. Take the “up to three” cap from lately.max, not a constant. Caution: candidates carry has_photo but no media url — resolve tiles via GET /media/{id}/url."}
        >
          Choices are saved in this browser only — no one else in the home sees them yet.
        </p>
      </aside>
    </div>
  );
}
