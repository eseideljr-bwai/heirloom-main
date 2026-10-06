'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Step 1 of the create flow. The cards *select* rather than navigate —
 * a mode is chosen, then committed with the footer button, as the
 * design specifies.
 */

const TalkIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
  </svg>
);

const WriteIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" /><path d="M16.4 3.6a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

const ImportIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const RecordIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="22" />
  </svg>
);

type Mode = {
  key: string;
  label: string;
  description: string;
  meta: string;
  href: string | null;
  available: boolean;
  icon: React.ReactNode;
};

const MODES: Mode[] = [
  {
    key: 'talk',
    label: 'Talk',
    description: 'Have a conversation. Kinloom asks gentle questions and shapes what you say into a kinloom you can edit.',
    meta: 'About ten minutes · speak or type your answers',
    href: '/create/talk',
    available: true,
    icon: <TalkIcon />,
  },
  {
    key: 'write',
    label: 'Write',
    description: 'Start from a blank page. Choose a type, give it a title, and write it the way you would say it.',
    meta: 'As long as you need · drafts save as you go',
    // Lands on the default type; the composer's own chips change it,
    // which is what retired the separate type-chooser route.
    href: '/create/story',
    available: true,
    icon: <WriteIcon />,
  },
  {
    key: 'import',
    label: 'Import',
    description: 'Bring in something that already exists — a letter, a scanned photograph, a document, an old recording.',
    meta: 'Photos, PDFs, documents and audio files',
    href: '/create/import',
    available: true,
    icon: <ImportIcon />,
  },
  {
    key: 'record',
    label: 'Record',
    description: 'Capture your voice or a short film now. Kinloom keeps the recording and transcribes it alongside.',
    meta: 'Audio or video · up to thirty minutes',
    href: null,
    available: false,
    icon: <RecordIcon />,
  },
];

export default function CreateModeChooser() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  const chosen = MODES.find(m => m.key === selected && m.available) ?? null;

  return (
    <>
      <div className="create-modes">
        {MODES.map(mode => {
          const on = mode.key === selected && mode.available;
          return (
            <button
              key={mode.key}
              type="button"
              className={`create-mode${on ? ' is-selected' : ''}${mode.available ? '' : ' is-unavailable'}`}
              aria-pressed={mode.available ? on : undefined}
              disabled={!mode.available}
              onClick={() => mode.available && setSelected(mode.key)}
            >
              {mode.available ? (
                <span className="create-mode__mark" aria-hidden="true">{on ? '✓' : ''}</span>
              ) : (
                <span className="create-mode__soon">Coming soon</span>
              )}
              <span className="create-mode__icon">{mode.icon}</span>
              <span className="create-mode__label">{mode.label}</span>
              <span className="create-mode__desc">{mode.description}</span>
              <span className="create-mode__meta">{mode.meta}</span>
            </button>
          );
        })}
      </div>

      <div className="create-foot">
        <p className="create-foot__note">
          Everything you create is saved privately to your Vault first.
          You decide who reads it at the end.
        </p>
        <button
          type="button"
          className="create-foot__go"
          disabled={!chosen}
          onClick={() => chosen?.href && router.push(chosen.href)}
        >
          {chosen ? `Continue with ${chosen.label} →` : 'Choose a way to begin'}
        </button>
      </div>
    </>
  );
}
