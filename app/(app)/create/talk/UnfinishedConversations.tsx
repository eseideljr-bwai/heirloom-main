'use client';

import { useState } from 'react';
import { formatRelativeTime } from '../../../../lib/kinloom';
import type { SavedConversation } from '../../../../lib/agent/conversation-store';

/** Segments in a card's progress bar; one fills per answer, up to this many. */
const PROGRESS_SEGMENTS = 4;

type Props = {
  /** The member's saved conversations, newest first (the open one included). */
  conversations: SavedConversation[];
  /** The conversation open now: its card is marked, not clickable. */
  activeId: string;
  /** True while a reply is in flight: switching then would misfile the reply. */
  disabled: boolean;
  onOpen: (id: string) => void;
  onDiscard: (id: string) => void;
};

/**
 * The "Unfinished conversations" rail beside Talk: conversations the member
 * saved before shaping them into a kinloom. Clicking a card reopens it; ×
 * discards it.
 *
 * On phones (≤ 900px, CSS only) it is a collapsible bar above the thread:
 * collapsed by default so the conversation keeps the screen, with the title
 * and count always visible as the toggle. On desktop it is always open and
 * the toggle is inert.
 */
export default function UnfinishedConversations({ conversations, activeId, disabled, onOpen, onDiscard }: Props) {
  const count = conversations.length;
  // Phones only (CSS ignores it on desktop). Collapsed by default.
  const [expanded, setExpanded] = useState(false);

  return (
    <aside
      className={`talk-rail${count === 0 ? ' talk-rail--empty' : ''}${expanded ? ' is-expanded' : ''}`}
      aria-labelledby="talk-rail-title"
    >
      <h2 className="talk-rail__heading">
        <button
          type="button"
          className="talk-rail__head"
          onClick={() => setExpanded(v => !v)}
          aria-expanded={expanded}
          aria-controls="talk-rail-body"
        >
          <span id="talk-rail-title" className="talk-rail__title">Unfinished conversations</span>
          <span className="talk-rail__head-end">
            {count > 0 && <span className="talk-rail__count">{count}</span>}
            <svg className="talk-rail__chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </button>
      </h2>

      <div id="talk-rail-body" className="talk-rail__body">

      {count === 0 ? (
        <p className="talk-rail__empty">
          Save a conversation you aren&rsquo;t ready to shape into a kinloom, and it waits here so you can pick it
          back up.
        </p>
      ) : (
        <>
          <p className="talk-rail__sub">Pick up where you left off.</p>
          <ul className="talk-rail__list">
            {conversations.map(c => {
              const isOpen = c.id === activeId;
              const filled = Math.min(c.answers, PROGRESS_SEGMENTS);
              const answers = `${c.answers} ${c.answers === 1 ? 'answer' : 'answers'}`;
              return (
                <li key={c.id} className={`talk-rail__card${isOpen ? ' is-open' : ''}`}>
                  <button
                    type="button"
                    className="talk-rail__open"
                    onClick={() => {
                      // Give the screen back to the conversation being opened.
                      setExpanded(false);
                      onOpen(c.id);
                    }}
                    disabled={disabled || isOpen}
                    aria-current={isOpen ? 'true' : undefined}
                    aria-label={isOpen ? `Open now: ${c.title}` : `Continue conversation: ${c.title}`}
                  >
                    <span className="talk-rail__kind">{isOpen ? 'Talk · Open now' : 'Talk'}</span>
                    <span className="talk-rail__card-title">{c.title}</span>
                    <span className="talk-rail__progress" aria-hidden="true">
                      {Array.from({ length: PROGRESS_SEGMENTS }, (_, i) => (
                        <span key={i} className={i < filled ? 'is-filled' : undefined} />
                      ))}
                    </span>
                    <span className="talk-rail__meta">
                      {answers} · {formatRelativeTime(c.updatedAt)}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="talk-rail__discard"
                    onClick={() => onDiscard(c.id)}
                    disabled={disabled}
                    aria-label={`Discard conversation: ${c.title}`}
                    title={isOpen ? 'Remove from unfinished conversations' : 'Discard'}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                      <line x1="6" y1="6" x2="18" y2="18" />
                      <line x1="18" y1="6" x2="6" y2="18" />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
      </div>
    </aside>
  );
}
