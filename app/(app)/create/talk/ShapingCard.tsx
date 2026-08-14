'use client';

export type ProposeDraftInput = {
  title: string;
  type_slug: string;
  body: string;
  confidence_notes?: string;
};

type Props = {
  toolUseId: string;
  input: ProposeDraftInput;
  onPublish: (input: ProposeDraftInput) => void;
  onKeepGoing: (toolUseId: string) => void;
  onStartOver: () => void;
};

export function ShapingCard({ input, toolUseId, onPublish, onKeepGoing, onStartOver }: Props) {
  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 12,
      background: 'var(--card)',
      padding: '32px 36px',
      marginBottom: 48,
    }}>
      <p style={{
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--fg-4)',
        margin: '0 0 20px',
      }}>
        Draft kinloom
      </p>

      <p style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 22,
        fontWeight: 400,
        lineHeight: 1.3,
        color: 'var(--fg-1)',
        margin: '0 0 6px',
      }}>
        {input.title}
      </p>

      <p style={{
        fontSize: 12,
        color: 'var(--fg-4)',
        margin: '0 0 20px',
        textTransform: 'capitalize',
      }}>
        {input.type_slug.replace('-', '‑')}
      </p>

      <div style={{
        borderTop: '1px solid var(--border)',
        paddingTop: 20,
        marginBottom: 28,
      }}>
        <p style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 17,
          lineHeight: 1.75,
          color: 'var(--fg-2)',
          margin: 0,
          whiteSpace: 'pre-wrap',
        }}>
          {input.body}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          onClick={() => onPublish(input)}
          style={{
            background: 'var(--primary)',
            color: 'var(--primary-foreground)',
            border: 'none',
            borderRadius: 8,
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 500,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          Continue to publish
        </button>
        <button
          onClick={() => onKeepGoing(toolUseId)}
          style={{
            background: 'none',
            color: 'var(--fg-2)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 500,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          Keep going
        </button>
        <button
          onClick={onStartOver}
          className="text-btn text-btn--quiet text-btn--push"
        >
          Start over
        </button>
      </div>
    </div>
  );
}
