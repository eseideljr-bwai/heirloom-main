'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiError } from '../../../../../lib/api';
import {
  resetSpaceFeatured,
  saveSpaceFeatured,
  type SpaceFeaturedPicks,
  type SpaceFeaturedSlotName,
} from '../../../../../lib/space-featured';

/** What the editor needs of a kinloom: the API's card, plus the quote on quote candidates. */
export type FeaturedCard = {
  id: string;
  title: string;
  by: string;
  /** The author's Home, when the API names it. */
  home: string | null;
  kind: 'film' | 'photograph' | 'voice' | 'written';
  quote: string | null;
  /** The API's thumbnail (signed), or null when the kinloom has no photo or video. */
  image: string | null;
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
  spaceId: string;
  spaceName: string;
  slots: Record<SpaceFeaturedSlotName, SlotData>;
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
      {c.image ? (
        <img className="feat-card__img" src={c.image} alt="" loading="lazy" decoding="async" />
      ) : (
        <span className="feat-card__img feat-card__img--none" />
      )}
      <span className="feat-card__body">
        <span className="feat-card__kind">{KIND_LABEL[c.kind]}</span>
        <span className="feat-card__title">{showQuote && c.quote ? `“${c.quote}”` : c.title}</span>
        {c.by && <span className="feat-card__by">{c.home ? `${c.by} · ${c.home}` : c.by}</span>}
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

export default function SpaceFeaturedClient({ spaceId, spaceName, slots, cards }: Props) {
  const router = useRouter();
  const initial: SpaceFeaturedPicks = useMemo(
    () => ({ lead: slots.lead.picks, quote: slots.quote.picks, pins: slots.pins.picks }),
    [slots],
  );
  const [picks, setPicks] = useState<SpaceFeaturedPicks>(initial);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const dirty = (Object.keys(initial) as SpaceFeaturedSlotName[]).some(
    k => initial[k].join(',') !== picks[k].join(','),
  );
  const anyPicked = (Object.keys(picks) as SpaceFeaturedSlotName[]).some(k => picks[k].length > 0);
  const pinsMax = slots.pins.max;

  const pickOne = (slot: 'lead' | 'quote', id: string) =>
    setPicks(p => {
      const next = { ...p, [slot]: p[slot][0] === id ? [] : [id] };
      // The lead is never also a pin.
      if (slot === 'lead' && next.lead[0]) next.pins = p.pins.filter(x => x !== next.lead[0]);
      return next;
    });

  const togglePin = (id: string) =>
    setPicks(p => {
      const has = p.pins.includes(id);
      if (!has && p.pins.length >= pinsMax) return p;
      return { ...p, pins: has ? p.pins.filter(x => x !== id) : [...p.pins, id] };
    });

  const card = (id: string): FeaturedCard | null => cards[id] ?? null;

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      await saveSpaceFeatured(spaceId, picks);
      setStatus({ kind: 'ok', text: 'Saved. Every home in this Space now sees this.' });
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
      await resetSpaceFeatured(spaceId);
      setPicks({ lead: [], quote: [], pins: [] });
      setStatus({ kind: 'ok', text: 'Back to automatic. Kinloom is choosing again.' });
      router.refresh();
    } catch (err) {
      setStatus({ kind: 'error', text: saveError(err) });
    } finally {
      setSaving(false);
    }
  };

  const lead = card(picks.lead[0] ?? '') ?? (picks.lead.length === 0 ? card(slots.lead.automatic[0] ?? '') : null);
  const quote = card(picks.quote[0] ?? '') ?? (picks.quote.length === 0 ? card(slots.quote.automatic[0] ?? '') : null);
  const pinned = picks.pins.map(card).filter((c): c is FeaturedCard => c !== null);

  if (slots.pins.candidates.length === 0) {
    return (
      <div className="empty-card">
        <p className="empty-card__text">
          Nothing has been published to {spaceName} yet, so there is nothing to feature.
        </p>
        <Link href="/spaces/tapestry" className="empty-card__cta">Back to the Tapestry →</Link>
      </div>
    );
  }

  return (
    <div className="feat-layout">
      <div>
        <Section
          n={1}
          title="What opens the Tapestry"
          sub="The large film or photograph at the top."
          more={slots.lead.hasMore}
        >
          {slots.lead.candidates.length === 0 ? (
            <p className="feat-grid__empty">Nothing published to this Space carries a photograph or film yet.</p>
          ) : (
            slots.lead.candidates.map(c => (
              <Card key={c.id} c={c} on={picks.lead[0] === c.id} disabled={saving} onToggle={() => pickOne('lead', c.id)} />
            ))
          )}
        </Section>

        <Section
          n={2}
          title="The words this family returns to"
          sub="One quotation, set large, with the person who said it."
          more={slots.quote.hasMore}
        >
          {slots.quote.candidates.length === 0 ? (
            <p className="feat-grid__empty">
              No kinloom published here has a quotation yet. Its author adds one when they edit it.
            </p>
          ) : (
            slots.quote.candidates.map(c => (
              <Card key={c.id} c={c} showQuote on={picks.quote[0] === c.id} disabled={saving} onToggle={() => pickOne('quote', c.id)} />
            ))
          )}
        </Section>

        <Section
          n={3}
          title="Pinned"
          sub={`Choose up to ${pinsMax}. They sit under the lead, in the order you pick them.`}
          more={slots.pins.hasMore}
        >
          {slots.pins.candidates.map(c => {
            const on = picks.pins.includes(c.id);
            return (
              <Card
                key={c.id}
                c={c}
                on={on}
                disabled={saving || (!on && picks.pins.length >= pinsMax) || picks.lead[0] === c.id}
                onToggle={() => togglePin(c.id)}
              />
            );
          })}
        </Section>
      </div>

      <aside className="feat-preview">
        <p className="feat-preview__label">How the Tapestry will open</p>

        {lead?.image ? (
          <img className="feat-preview__hero" src={lead.image} alt="" decoding="async" />
        ) : (
          <span className="feat-preview__hero feat-preview__hero--none" />
        )}
        {lead && <p className="feat-preview__title">{lead.title}</p>}

        {quote?.quote && (
          <p className="feat-preview__quote">
            “{quote.quote}” <span className="feat-preview__quote-by">— {quote.by}</span>
          </p>
        )}

        {pinned.length > 0 && (
          <div className="feat-preview__strip">
            {pinned.map(c => (
              <span key={c.id} className="feat-preview__thumb">
                {c.image ? (
                  <img className="feat-preview__thumb-img" src={c.image} alt="" loading="lazy" decoding="async" />
                ) : (
                  <span className="feat-preview__thumb-img" />
                )}
                <span className="feat-preview__thumb-cap">{c.title}</span>
              </span>
            ))}
          </div>
        )}

        <p className="feat-preview__note">
          You choose what matters. Kinloom decides the sizes, the order and the spacing.
        </p>

        {!anyPicked && (
          <p className="feat-preview__fallback">
            Nothing chosen. Kinloom is showing what was published most recently, and nothing is pinned.
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

        <Link href="/spaces/tapestry" className="feat-preview__cta">See it on the Tapestry →</Link>
      </aside>
    </div>
  );
}

function saveError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return 'Only the owner of this Family Space can change what’s featured.';
    if (err.status === 423) return 'This Family Space is read-only right now, so it can’t be changed.';
    if (err.status === 404) return 'One of those kinlooms is no longer available. Reload and choose again.';
    return err.firstFieldError() || err.message || 'Could not save.';
  }
  return 'Could not save.';
}
