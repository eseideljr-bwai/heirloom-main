import Link from 'next/link';

const MODES = [
  {
    key: 'talk',
    label: 'Talk',
    description: 'Have a conversation. The agent will ask thoughtful questions to draw out what matters most.',
    href: '/create/talk',
    available: true,
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9l-5 4V6Z" />
        <path d="M9 11h10M9 15h6" />
      </svg>
    ),
  },
  {
    key: 'write',
    label: 'Write',
    description: 'Write it yourself. Choose a type and compose your kinloom in your own words at your own pace.',
    href: '/create/type-grid',
    available: true,
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 22h4l12-12-4-4L4 18v4Z" />
        <path d="M17 7l4 4" />
      </svg>
    ),
  },
  {
    key: 'record',
    label: 'Record',
    description: 'Speak it out loud. The agent listens, then helps you shape what you said into a kinloom.',
    href: null,
    available: false,
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="10" y="3" width="8" height="14" rx="4" />
        <path d="M5 14a9 9 0 0 0 18 0" />
        <line x1="14" y1="23" x2="14" y2="27" />
        <line x1="10" y1="27" x2="18" y2="27" />
      </svg>
    ),
  },
] as const;

export default function CreatePage() {
  return (
    <div style={{ padding: '48px', maxWidth: 760 }}>

      <div style={{ marginBottom: 56 }}>
        <p className="eyebrow" style={{ marginBottom: 12 }}>Create</p>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 400,
          fontSize: 48,
          lineHeight: 1.1,
          margin: '0 0 16px',
          color: 'var(--fg-1)',
        }}>
          How would you like to begin?
        </h1>
        <p style={{ fontSize: 17, lineHeight: 1.65, color: 'var(--fg-3)', margin: 0, maxWidth: 480 }}>
          A kinloom can start from a conversation, a blank page, or a recording. Choose what feels right.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {MODES.map(mode => {
          const cardStyle: React.CSSProperties = {
            display: 'flex',
            alignItems: 'flex-start',
            gap: 24,
            padding: '28px 32px',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            textDecoration: 'none',
            color: 'inherit',
            position: 'relative',
            opacity: mode.available ? 1 : 0.55,
            cursor: mode.available ? 'pointer' : 'default',
            transition: 'box-shadow 150ms ease',
          };

          const inner = (
            <>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: 10,
                background: 'var(--secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
                flexShrink: 0,
              }}>
                {mode.icon}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontFamily: 'var(--font-serif)',
                  fontWeight: 400,
                  fontSize: 24,
                  margin: '0 0 6px',
                  color: 'var(--fg-1)',
                  lineHeight: 1.2,
                }}>
                  {mode.label}
                </p>
                <p style={{
                  fontSize: 15,
                  lineHeight: 1.6,
                  color: 'var(--fg-3)',
                  margin: 0,
                }}>
                  {mode.description}
                </p>
              </div>

              {!mode.available && (
                <span style={{
                  position: 'absolute',
                  top: 16,
                  right: 20,
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--fg-4)',
                }}>
                  Coming soon
                </span>
              )}

              {mode.available && (
                <div style={{ display: 'flex', alignItems: 'center', alignSelf: 'center', color: 'var(--fg-4)', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M7 13 L11 9 L7 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </>
          );

          return mode.available ? (
            <Link key={mode.key} href={mode.href!} style={cardStyle}>
              {inner}
            </Link>
          ) : (
            <div key={mode.key} style={cardStyle}>
              {inner}
            </div>
          );
        })}
      </div>

    </div>
  );
}
