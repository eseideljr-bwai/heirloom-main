'use client';

import { useState } from 'react';
import Link from 'next/link';

function VaultMark() {
  return (
    <svg viewBox="0 0 480 280" width="100%" style={{ maxWidth: 560, display: 'block' }} aria-hidden="true">
      <defs>
        <radialGradient id="vaultCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e8d4a8" stopOpacity="0.95" />
          <stop offset="40%" stopColor="#c9a96e" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#c9a96e" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="vaultDepth" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3a3934" stopOpacity="0.18" />
          <stop offset="70%" stopColor="#3a3934" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#3a3934" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="threadL" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#a39376" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#556b5b" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="threadR" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#556b5b" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#a39376" stopOpacity="0.7" />
        </linearGradient>
      </defs>

      <circle cx="240" cy="140" r="84" fill="url(#vaultDepth)">
        <animate attributeName="r" values="80;94;80" dur="6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;1;0.6" dur="6s" repeatCount="indefinite" />
      </circle>

      <circle cx="240" cy="140" r="56" fill="url(#vaultCore)">
        <animate attributeName="r" values="52;60;52" dur="4s" repeatCount="indefinite" />
      </circle>
      <circle cx="240" cy="140" r="3" fill="#c9a96e" opacity="0.9">
        <animate attributeName="opacity" values="0.6;1;0.6" dur="2.4s" repeatCount="indefinite" />
      </circle>

      {/* Left woven door */}
      <g opacity="0.85">
        {Array.from({ length: 9 }).map((_, i) => {
          const x = 80 + i * 14;
          return (
            <path key={`lw-${i}`}
              d={`M ${x} 56 Q ${x - 4} 140 ${x} 224`}
              fill="none" stroke="url(#threadL)" strokeWidth="0.9"
              opacity={0.55 + (i % 3) * 0.12} />
          );
        })}
        {[78, 100, 122, 144, 166, 188, 210].map((y, i) => (
          <path key={`lwf-${i}`}
            d={`M 78 ${y} Q 140 ${y + (i % 2 ? 3 : -3)} 200 ${y}`}
            fill="none" stroke="#a39376" strokeWidth="0.7" opacity="0.5" />
        ))}
        <path d="M 200 56 Q 196 140 200 224" fill="none" stroke="#3a3934" strokeWidth="0.8" opacity="0.4" />
      </g>

      {/* Right woven door */}
      <g opacity="0.85">
        {Array.from({ length: 9 }).map((_, i) => {
          const x = 286 + i * 14;
          return (
            <path key={`rw-${i}`}
              d={`M ${x} 56 Q ${x + 4} 140 ${x} 224`}
              fill="none" stroke="url(#threadR)" strokeWidth="0.9"
              opacity={0.55 + (i % 3) * 0.12} />
          );
        })}
        {[78, 100, 122, 144, 166, 188, 210].map((y, i) => (
          <path key={`rwf-${i}`}
            d={`M 282 ${y} Q 340 ${y + (i % 2 ? -3 : 3)} 402 ${y}`}
            fill="none" stroke="#a39376" strokeWidth="0.7" opacity="0.5" />
        ))}
        <path d="M 282 56 Q 286 140 282 224" fill="none" stroke="#3a3934" strokeWidth="0.8" opacity="0.4" />
      </g>

      <path d="M 60 50 L 420 50 L 420 230 L 60 230 Z" fill="none" stroke="#3a3934" strokeWidth="0.6" opacity="0.18" />

      <circle cx="240" cy="60" r="2" fill="#a39376" opacity="0.8">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="240" cy="220" r="2" fill="#556b5b" opacity="0.8">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="3s" begin="1s" repeatCount="indefinite" />
      </circle>
      <circle cx="100" cy="140" r="2" fill="#a39376" opacity="0.8">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="3s" begin="0.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="380" cy="140" r="2" fill="#556b5b" opacity="0.8">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="3s" begin="1.5s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function ListeningOrb() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" style={{ flexShrink: 0 }} aria-hidden="true">
      <defs>
        <radialGradient id="orbCoreLB" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c9a96e" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#556b5b" stopOpacity="0.4" />
        </radialGradient>
      </defs>
      <circle cx="18" cy="18" r="14" fill="none" stroke="#556b5b" strokeWidth="0.6" opacity="0.3">
        <animate attributeName="r" values="12;16;12" dur="4s" repeatCount="indefinite" />
      </circle>
      <circle cx="18" cy="18" r="9" fill="url(#orbCoreLB)" opacity="0.85">
        <animate attributeName="opacity" values="0.7;1;0.7" dur="3.2s" repeatCount="indefinite" />
      </circle>
      <circle cx="18" cy="18" r="2" fill="#fdfcfa" opacity="0.9" />
    </svg>
  );
}

const DEPOSIT_PROMPTS = [
  { id: 'voice',  kind: 'A voice memory',              invitation: 'Speak something you would want them to hear.' },
  { id: 'letter', kind: 'A written reflection',         invitation: 'Write a letter to someone not yet born.' },
  { id: 'photo',  kind: 'A photograph, with context',   invitation: 'Show them a moment that shaped you.' },
  { id: 'lesson', kind: 'A life lesson',                invitation: 'Pass on something you learned the hard way.' },
  { id: 'belief', kind: 'A belief, a value',            invitation: 'Tell them what you stand for, in your own words.' },
];

const TRUST_POINTS = [
  {
    title: 'Yours, until you decide',
    body: 'Nothing here is shared until you choose who, when, and how.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#556b5b" strokeWidth="1.4" strokeLinejoin="round">
        <path d="M12 2 L4 6 V12 C4 17 7.5 21 12 22 C16.5 21 20 17 20 12 V6 L12 2 Z" />
      </svg>
    ),
  },
  {
    title: 'Encrypted at rest',
    body: 'Sealed with a key only you and your trusted kin will hold.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#556b5b" strokeWidth="1.4">
        <rect x="5" y="11" width="14" height="10" rx="1.5" />
        <path d="M8 11 V7 a4 4 0 0 1 8 0 V11" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Passed, not posted',
    body: 'When the time comes, the vault opens to the kin you name. Not to the world.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#556b5b" strokeWidth="1.4" strokeLinejoin="round">
        <path d="M3 8 L12 13 L21 8 M3 8 V18 a1 1 0 0 0 1 1 H20 a1 1 0 0 0 1 -1 V8 M3 8 L12 3 L21 8" />
      </svg>
    ),
  },
];

function DepositPrompt({ prompt, index, isLast }: { prompt: typeof DEPOSIT_PROMPTS[number]; index: number; isLast: boolean }) {
  const [hover, setHover] = useState(false);
  return (
    <Link
      href="/create"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid', gridTemplateColumns: '40px 1fr auto', gap: 24,
        alignItems: 'center', textAlign: 'left',
        padding: hover ? '24px 4px 24px 14px' : '24px 4px',
        background: 'transparent',
        borderBottom: isLast ? 'none' : '1px solid #d4d2cc',
        textDecoration: 'none',
        transition: 'padding 200ms cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      <span style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'rgba(26,26,26,0.4)', fontStyle: 'italic' }}>
        {String(index + 1).padStart(2, '0')}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
        <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 22, lineHeight: 1.3, margin: 0, color: '#1a1a1a' }}>
          {prompt.invitation}
        </h3>
        <p style={{ margin: 0, fontSize: 13, color: 'rgba(26,26,26,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {prompt.kind}
        </p>
      </div>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: hover ? '#556b5b' : 'rgba(26,26,26,0.4)', fontStyle: 'italic', paddingRight: 8, transition: 'color 200ms', flexShrink: 0 }}>
        Begin
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M3 8 L13 8 M9 4 L13 8 L9 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </Link>
  );
}

export default function LegacyBankPage() {
  return (
    <div style={{ padding: '48px', maxWidth: 880 }}>
      <p className="eyebrow" style={{ marginBottom: 14 }}>AI Legacy Bank</p>

      <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 56, lineHeight: 1.05, letterSpacing: '-0.01em', margin: '0 0 22px', color: '#1a1a1a', maxWidth: 720 }}>
        A vault for what words alone can&apos;t carry.
      </h1>

      <p style={{ fontSize: 19, lineHeight: 1.7, color: 'rgba(26,26,26,0.65)', margin: '0 0 56px', maxWidth: 600, fontFamily: 'var(--font-serif)' }}>
        One day, someone you love will want to know who you were — not what you did, but how you saw. The vault is empty, and waiting, and listening.
      </p>

      {/* Hero */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '0 -48px 64px', position: 'relative' }}>
        <VaultMark />
      </div>

      {/* Deposit prompts */}
      <div style={{ marginBottom: 64 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
          <p className="eyebrow" style={{ margin: 0, flexShrink: 0 }}>The first deposit</p>
          <span style={{ fontSize: 12, color: 'rgba(26,26,26,0.45)', fontStyle: 'italic' }}>
            Choose any one. There&apos;s no order, and no clock.
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {DEPOSIT_PROMPTS.map((p, i) => (
            <DepositPrompt key={p.id} prompt={p} index={i} isLast={i === DEPOSIT_PROMPTS.length - 1} />
          ))}
        </div>
      </div>

      {/* AI presence */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '20px 24px', background: 'rgba(85,107,91,0.04)', border: '1px solid rgba(85,107,91,0.14)', borderRadius: 12, marginBottom: 32 }}>
        <ListeningOrb />
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'rgba(26,26,26,0.75)', fontStyle: 'italic', fontFamily: 'var(--font-serif)' }}>
          A quiet companion will help organize and protect what you keep here. It listens, never speaks, and never shares without your blessing.
        </p>
      </div>

      {/* Trust */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, marginBottom: 56, border: '1px solid #d4d2cc', borderRadius: 12, background: '#fff', overflow: 'hidden' }}>
        {TRUST_POINTS.map((t, i) => (
          <div key={t.title} style={{ padding: 24, borderRight: i < TRUST_POINTS.length - 1 ? '1px solid #d4d2cc' : 'none' }}>
            <div style={{ marginBottom: 12 }}>{t.icon}</div>
            <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>{t.title}</p>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'rgba(26,26,26,0.55)' }}>{t.body}</p>
          </div>
        ))}
      </div>

      {/* CTAs */}
      <div style={{ textAlign: 'center', paddingTop: 16 }}>
        <div style={{ display: 'inline-flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/create"
            style={{ display: 'inline-flex', alignItems: 'center', background: '#556b5b', color: '#fdfcfa', padding: '16px 36px', borderRadius: 8, fontSize: 16, fontWeight: 500, textDecoration: 'none', fontFamily: 'var(--font-serif)', letterSpacing: '0.01em' }}>
            Begin the vault
          </Link>
          <Link href="/legacy-bank/chat"
            style={{ display: 'inline-flex', alignItems: 'center', background: 'transparent', color: '#1a1a1a', border: '1px solid #d4d2cc', padding: '16px 32px', borderRadius: 8, fontSize: 16, textDecoration: 'none', fontFamily: 'var(--font-serif)', letterSpacing: '0.01em' }}>
            Try a conversation
          </Link>
        </div>
        <p style={{ margin: '14px 0 0', fontSize: 12, color: 'rgba(26,26,26,0.45)', fontStyle: 'italic' }}>
          You can leave at any time. Nothing is shared yet, and nothing will be without you.
        </p>
      </div>
    </div>
  );
}
