'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiError } from '../../../../../lib/api';
import {
  resetHomeFeatured,
  saveHomeFeatured,
  type FeaturedPicks,
  type FeaturedSlotName,
} from '../../../../../lib/home-featured';
import { revalidateFamilyData } from '../../../../actions';

/** What the editor needs of a kinloom: the API's card, plus the quote on quote candidates. */
export type FeaturedCard = {
  id: string;
  title: string;
  by: string;
  kind: 'film' | 'photograph' | 'voice' | 'written';
  quote: string | null;
};

export type SlotData = {
  max: number;
  picks: string[];
  automatic: string[];
  candidates: FeaturedCard[];
  /** More candidates exist than the page shows. */
  hasMore: boolean;
};

type Props = {
  homeId: string;
  homeName: string;
  slots: Record<FeaturedSlotName, SlotData>;
  /** Every card the client may need to show, by id (candidates, picks and automatic). */
  cards: Record<string, FeaturedCard>;
};

const KIND_LABEL: Record<FeaturedCard['kind'], string> = {
  film: 'Film',
  photograph: 'Photograph',
  voice: 'Voice',
  written: 'Written',
};

function Card({
  c,
  on,
  disabled,
  showQuote,
  onToggle,
}: {
  c: FeaturedCard;
  on: boolean;
  disabled?: boolean;
  showQuote?: boolean;
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
      <span className="feat-card__img feat-card__img--none" />
      <span className="feat-card__body">
        <span className="feat-card__kind">{KIND_LABEL[c.kind]}</span>
        <span className="feat-card__title">{showQuote && c.quote ? `“${c.quote}”` : c.title}</span>
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
  more,
}: {
  n: number;
  title: string;
  sub: string;
  children: React.ReactNode;
  more?: boolean;
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
      <div className="feat-grid">{children}</div>
      {more && <p className="feat-grid__empty">Showing the most recent. Older kinlooms aren’t listed here.</p>}
    </section>
  );
}

export default function HomeFeaturedClient({ homeId, homeName, slots, cards }: Props) {
  const router = useRouter();
  const initial: FeaturedPicks = useMemo(
    () => ({
      hero: slots.hero.picks,
      quote: slots.quote.picks,
      voice: slots.voice.picks,
      lately: slots.lately.picks,
    }),
    [slots],
  );
  const [picks, setPicks] = useState<FeaturedPicks>(initial);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const dirty = (Object.keys(initial) as FeaturedSlotName[]).some(
    k => initial[k].join(',') !== picks[k].join(','),
  );
  const anyPicked = (Object.keys(picks) as FeaturedSlotName[]).some(k => picks[k].length > 0);
  const latelyMax = slots.lately.max;

  const pickOne = (slot: 'hero' | 'quote' | 'voice', id: string) =>
    setPicks(p => {
      const next = { ...p, [slot]: p[slot][0] === id ? [] : [id] };
      // The hero is never also a "lately" card.
      if (slot === 'hero' && next.hero[0]) next.lately = p.lately.filter(x => x !== next.hero[0]);
      return next;
    });

  const toggleLately = (id: string) =>
    setPicks(p => {
      const has = p.lately.includes(id);
      if (!has && p.lately.length >= latelyMax) return p;
      return { ...p, lately: has ? p.lately.filter(x => x !== id) : [...p.lately, id] };
    });

  const card = (id: string): FeaturedCard | null => cards[id] ?? null;

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      await saveHomeFeatured(homeId, picks);
      await revalidateFamilyData();
      setStatus({ kind: 'ok', text: 'Saved. Everyone in your home now sees this.' });
      router.refresh();
    } catch (err) {
      setStatus({ kind: 'error', text: saveError(err) });
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setSaving(true);
    setStatus(null);
    try {
      await resetHomeFeatured(homeId);
      await revalidateFamilyData();
      setPicks({ hero: [], quote: [], voice: [], lately: [] });
      setStatus({ kind: 'ok', text: 'Back to automatic. Kinloom is choosing again.' });
      router.refresh();
    } catch (err) {
      setStatus({ kind: 'error', text: saveError(err) });
    } finally {
      setSaving(false);
    }
  };

  const hero = card(picks.hero[0] ?? '') ?? (picks.hero.length === 0 ? card(slots.hero.automatic[0] ?? '') : null);
  const quote = card(picks.quote[0] ?? '') ?? (picks.quote.length === 0 ? card(slots.quote.automatic[0] ?? '') : null);
  const voice = card(picks.voice[0] ?? '') ?? (picks.voice.length === 0 ? card(slots.voice.automatic[0] ?? '') : null);
  const latelyIds = picks.lately.length > 0 ? picks.lately : slots.lately.automatic;
  const lately = latelyIds.map(card).filter((c): c is FeaturedCard => c !== null);

  const noCandidates =
    slots.lately.candidates.length === 0;

  if (noCandidates) {
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
      <div>
        <Section
          n={1}
          title="What opens the page"
          sub="The large film or photograph beside your home’s name."
          more={slots.hero.hasMore}
        >
          {slots.hero.candidates.length === 0 ? (
            <p className="feat-grid__empty">
              Nothing published to this home carries a photograph or film yet.
            </p>
          ) : (
            slots.hero.candidates.map(c => (
              <Card key={c.id} c={c} on={picks.hero[0] === c.id} disabled={saving} onToggle={() => pickOne('hero', c.id)} />
            ))
          )}
        </Section>

        <Section
          n={2}
          title="The words your home returns to"
          sub="One quotation, set large, with the person who said it."
          more={slots.quote.hasMore}
        >
          {slots.quote.candidates.length === 0 ? (
            <p className="feat-grid__empty">
              No kinloom published here has a quotation yet. Add one when you edit a kinloom.
            </p>
          ) : (
            slots.quote.candidates.map(c => (
              <Card key={c.id} c={c} showQuote on={picks.quote[0] === c.id} disabled={saving} onToggle={() => pickOne('quote', c.id)} />
            ))
          )}
        </Section>

        <Section
          n={3}
          title="A voice in the family"
          sub="One recording, shown with the face of the person speaking."
          more={slots.voice.hasMore}
        >
          {slots.voice.candidates.length === 0 ? (
            <p className="feat-grid__empty">No recordings have been published here yet.</p>
          ) : (
            slots.voice.candidates.map(c => (
              <Card key={c.id} c={c} on={picks.voice[0] === c.id} disabled={saving} onToggle={() => pickOne('voice', c.id)} />
            ))
          )}
        </Section>

        <Section
          n={4}
          title="Lately in the family"
          sub={`Choose up to ${latelyMax}. Kinloom sizes and orders them.`}
          more={slots.lately.hasMore}
        >
          {slots.lately.candidates.map(c => {
            const on = picks.lately.includes(c.id);
            return (
              <Card
                key={c.id}
                c={c}
                on={on}
                disabled={saving || (!on && picks.lately.length >= latelyMax) || picks.hero[0] === c.id}
                onToggle={() => toggleLately(c.id)}
              />
            );
          })}
        </Section>
      </div>

      <aside className="feat-preview">
        <p className="feat-preview__label">How Home will open</p>

        <span className="feat-preview__hero feat-preview__hero--none" />
        {hero && <p className="feat-preview__title">{hero.title}</p>}

        {quote?.quote && (
          <p className="feat-preview__quote">
            “{quote.quote}” <span className="feat-preview__quote-by">— {quote.by}</span>
          </p>
        )}

        {lately.length > 0 && (
          <div className="feat-preview__strip">
            {lately.map(c => (
              <span key={c.id} className="feat-preview__thumb">
                <span className="feat-preview__thumb-img" />
                <span className="feat-preview__thumb-cap">{c.title}</span>
              </span>
            ))}
          </div>
        )}

        {voice && <p className="feat-preview__voice">Voice · {voice.title}</p>}

        <p className="feat-preview__note">
          You choose what matters. Kinloom decides the sizes, the order and the spacing.
        </p>

        {!anyPicked && (
          <p className="feat-preview__fallback">
            Nothing chosen. Kinloom is showing what was published most recently.
          </p>
        )}

        {status && (
          <p className={`form-status form-status--${status.kind === 'ok' ? 'ok' : 'error'}`}>{status.text}</p>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '14px 0' }}>
          <button type="button" className="btn-save" onClick={save} disabled={saving || !dirty}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            className="btn-outline"
            onClick={reset}
            disabled={saving || (!anyPicked && !dirty)}
          >
            Use automatic
          </button>
        </div>

        <Link href="/home" className="feat-preview__cta">See it on Home →</Link>
      </aside>
    </div>
  );
}

function saveError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return 'Only the owner and co-owner can change what’s featured.';
    if (err.status === 423) return 'This home is read-only right now, so it can’t be changed.';
    return err.firstFieldError() || err.message || 'Could not save.';
  }
  return 'Could not save.';
}
