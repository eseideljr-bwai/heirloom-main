'use client';

import { useEffect, useRef, useState } from 'react';
import { getReach } from '../../lib/kinloom';

/**
 * The "who can read this" choice, shared by every place that publishes:
 * the publish step after Write and Talk, and the Biographer's batch card.
 *
 * A kinloom has a *set* of rooms: the author's Family Home and any Family
 * Space that Home is active in. The API says which rooms exist, whether each
 * takes new publications, and how many accounts read each. Clients never
 * work out readers themselves; the numbers shown come from the API.
 */
export type AudienceRoom = {
  type: 'home' | 'space';
  id: string;
  name: string;
  read_only: boolean;
  /** Other accounts that read this room. Absent until the API has said. */
  accounts?: number | null;
  /** Where the kinloom is published now (an existing kinloom only). */
  when?: 'now' | 'on_passing' | null;
};

export const roomKey = (r: { type: string; id: string }) => `${r.type}:${r.id}`;

export const people = (n: number) => `${n} ${n === 1 ? 'person' : 'people'}`;

/**
 * How many accounts a selection reaches. One room's count comes with the
 * room; two or more need the API to count people who sit in both only once,
 * so it is asked (the latest answer wins). `null` means still counting.
 */
export function useSelectionReach(selectedRooms: AudienceRoom[]): number | null {
  const selectionKey = selectedRooms.map(roomKey).join(',');
  const [combined, setCombined] = useState<{ key: string; accounts: number } | null>(null);
  const requestRef = useRef(0);

  useEffect(() => {
    if (selectedRooms.length < 2) return;
    const id = ++requestRef.current;
    getReach(selectedRooms)
      .then((res) => {
        if (id === requestRef.current) setCombined({ key: selectionKey, accounts: res.accounts });
      })
      .catch(() => {
        if (id === requestRef.current) setCombined(null);
      });
    // selectionKey captures the selected rooms.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey]);

  if (selectedRooms.length === 0) return 0;
  if (selectedRooms.length === 1) return selectedRooms[0].accounts ?? null;
  return combined?.key === selectionKey ? combined.accounts : null;
}

/** The line under the choice: what the current selection means for readers. */
export function audienceSummary(selectedCount: number, reach: number | null): string {
  if (selectedCount === 0) return 'Private. Only you can read it.';
  if (reach == null) return 'Counting who can read this…';
  if (reach === 0) return 'No one else can read this yet.';
  return `${people(reach)} will be able to read this.`;
}

/**
 * Rooms that come without counts (the create context) get them from one
 * `/reach` call. Rooms that already carry counts are returned unchanged.
 */
export function useRoomCounts(rooms: AudienceRoom[]): AudienceRoom[] {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const needs = rooms.some((r) => r.accounts == null);
  const key = rooms.map(roomKey).join(',');

  useEffect(() => {
    if (!needs || rooms.length === 0) return;
    let cancelled = false;
    getReach(rooms)
      .then((res) => {
        if (cancelled) return;
        const next: Record<string, number> = {};
        for (const t of res.by_target) next[roomKey(t)] = t.accounts;
        setCounts(next);
      })
      .catch(() => {
        // The choice still works; the per-room counts just stay blank.
      });
    return () => {
      cancelled = true;
    };
    // `key` captures the room list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, needs]);

  return rooms.map((r) => (r.accounts == null && counts[roomKey(r)] != null
    ? { ...r, accounts: counts[roomKey(r)] }
    : r));
}

function Option({
  name,
  meta,
  on,
  disabled,
  onToggle,
}: {
  name: string;
  meta: string;
  on: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={`pub-option${on ? ' is-on' : ''}`}
      aria-pressed={on}
      disabled={disabled}
      onClick={onToggle}
    >
      <span className="pub-option__box" aria-hidden="true">{on ? '✓' : ''}</span>
      <span className="pub-option__text">
        <span className="pub-option__name">{name}</span>
        <span className="pub-option__meta">{meta}</span>
      </span>
    </button>
  );
}

function roomMeta(r: AudienceRoom, kind: string): string {
  const parts = [kind];
  if (r.read_only) parts.push('read-only');
  else if (r.accounts != null) parts.push(`${people(r.accounts)} can read`);
  if (r.when === 'on_passing') parts.push('after I pass');
  return parts.join(' · ');
}

export default function AudiencePicker({
  rooms,
  selected,
  onChange,
  disabled,
}: {
  rooms: AudienceRoom[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  disabled?: boolean;
}) {
  const home = rooms.find((r) => r.type === 'home') ?? null;
  const spaces = rooms.filter((r) => r.type === 'space');

  const toggle = (r: AudienceRoom) => {
    const key = roomKey(r);
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  };

  return (
    <>
      <div className="pub-group">
        <p className="pub-group__label">Private</p>
        <div className="pub-group__opts">
          <Option
            name="Keep private"
            meta="Only you. It stays in your Vault."
            on={selected.size === 0}
            disabled={disabled}
            onToggle={() => onChange(new Set())}
          />
        </div>
      </div>

      {home && (
        <div className="pub-group">
          <p className="pub-group__label">Family Home</p>
          <div className="pub-group__opts">
            <Option
              name={`Publish to ${home.name}`}
              meta={roomMeta(home, 'Your Family Home')}
              on={selected.has(roomKey(home))}
              disabled={disabled || home.read_only}
              onToggle={() => toggle(home)}
            />
          </div>
        </div>
      )}

      <div className="pub-group">
        <p className="pub-group__label">Family Spaces</p>
        <div className="pub-group__opts">
          {spaces.length === 0 ? (
            <p className="pub-group__empty">
              Your Family Home isn&rsquo;t in a Family Space yet. Anything you publish here stays in your Family Home.
            </p>
          ) : (
            spaces.map((s) => (
              <Option
                key={s.id}
                name={`Publish to ${s.name}`}
                meta={roomMeta(s, 'Family Space')}
                on={selected.has(roomKey(s))}
                disabled={disabled || s.read_only}
                onToggle={() => toggle(s)}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}
