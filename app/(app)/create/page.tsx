'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

function RadialBullet({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="10" cy="10" r="8" fill="none" stroke="#556b5b" strokeWidth="1" opacity="0.25" />
      <circle cx="10" cy="10" r="5" fill="none" stroke="#556b5b" strokeWidth="1" opacity="0.45" />
      <circle cx="10" cy="10" r="2.5" fill="#556b5b" opacity="0.75" />
    </svg>
  );
}

function TalkIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function WriteIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function RecordIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="13" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <line x1="12" y1="18" x2="12" y2="22" />
    </svg>
  );
}

function ModeCard({ icon, title, description, onClick, comingSoon }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
  comingSoon?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={comingSoon ? undefined : onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
        gap: 14, padding: '24px 22px 22px',
        minHeight: 180,
        background: comingSoon ? 'rgba(85,107,91,0.02)' : (hover ? 'rgba(85,107,91,0.05)' : '#fff'),
        border: '1px solid #d4d2cc',
        borderRadius: 14,
        cursor: comingSoon ? 'default' : 'pointer',
        fontFamily: 'inherit', textAlign: 'left',
        opacity: comingSoon ? 0.65 : 1,
        transition: 'background 200ms',
      }}
    >
      {comingSoon && (
        <span style={{ position: 'absolute', top: 14, right: 16, fontSize: 9, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(26,26,26,0.4)' }}>
          Coming soon
        </span>
      )}
      <span style={{ color: '#556b5b' }}>{icon}</span>
      <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 26, margin: 0, color: '#1a1a1a', lineHeight: 1.1 }}>
        {title}
      </h3>
      <p style={{ fontSize: 13, lineHeight: 1.55, color: 'rgba(26,26,26,0.6)', margin: 0 }}>
        {description}
      </p>
    </button>
  );
}

export default function CreatePage() {
  const router = useRouter();
  const [input, setInput] = useState('');

  const goTalk = (prefill = '') => {
    if (prefill) {
      try { localStorage.setItem('kinloom-prefill', prefill); } catch {}
    }
    router.push('/create/talk');
  };

  const goWrite = () => {
    router.push('/create/write');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) goTalk(input.trim());
  };

  return (
    <div style={{ padding: '64px 80px 160px', maxWidth: 1100, display: 'flex', flexDirection: 'column' }}>

      {/* Section label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
        <span className="eyebrow">Create a kinloom</span>
      </div>

      {/* Headline */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 16 }}>
        <span style={{ marginTop: 18, flexShrink: 0 }}>
          <RadialBullet size={18} />
        </span>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 54, lineHeight: 1.05, margin: 0, letterSpacing: '-0.01em', color: '#1a1a1a' }}>
          What would you like to share today?
        </h1>
      </div>

      <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, lineHeight: 1.55, fontStyle: 'italic', color: 'rgba(26,26,26,0.6)', margin: '0 0 56px', maxWidth: 600, paddingLeft: 38 }}>
        You can start with a memory, a lesson, a belief, a person you love, or simply something that&apos;s been on your mind.
      </p>

      {/* Mode label */}
      <div style={{ marginBottom: 20, paddingLeft: 38 }}>
        <span className="eyebrow" style={{ fontSize: 10 }}>Choose how you&apos;d like to begin</span>
      </div>

      {/* Mode cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 48, paddingLeft: 38, maxWidth: 860 }}>
        <ModeCard
          icon={<TalkIcon />}
          title="Talk"
          description="Have a conversation. The agent will ask thoughtful questions to draw out what matters most."
          onClick={() => goTalk()}
        />
        <ModeCard
          icon={<WriteIcon />}
          title="Write"
          description="Write it yourself. The agent stays quiet, ready to help when you ask."
          onClick={goWrite}
        />
        <ModeCard
          icon={<RecordIcon />}
          title="Record"
          description="Speak it out loud. The agent listens, then helps you shape what you said."
          comingSoon
        />
      </div>

      {/* Persistent input shortcut to talk */}
      <div style={{ marginTop: 'auto', paddingLeft: 38, maxWidth: 860 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', padding: '18px 20px', background: '#fff', border: '1px solid #d4d2cc', borderRadius: 14, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e as unknown as React.FormEvent); } }}
            placeholder="Or share what's on your mind…"
            rows={1}
            style={{ flex: 1, resize: 'none', border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-serif)', fontSize: 17, lineHeight: 1.5, color: '#1a1a1a', minHeight: 26, maxHeight: 120, padding: 0 }}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            style={{ padding: '10px 20px', fontSize: 14, fontWeight: 500, background: input.trim() ? '#556b5b' : 'rgba(85,107,91,0.20)', color: '#fdfcfa', border: 'none', borderRadius: 10, cursor: input.trim() ? 'pointer' : 'default', fontFamily: 'inherit', flexShrink: 0, transition: 'background 200ms' }}
          >
            Share
          </button>
        </form>
      </div>
    </div>
  );
}
