'use client';

type ProposedKinloom = {
  working_title: string;
  one_line_summary: string;
  suggested_type_slug: string;
};

export type SplitIntoMultipleInput = {
  proposed_kinlooms: [ProposedKinloom, ProposedKinloom];
  reasoning?: string;
};

type Props = {
  toolUseId: string;
  input: SplitIntoMultipleInput;
  onDevelopFirst: (kinloom: ProposedKinloom, toolUseId: string) => void;
  onKeepTalking: (toolUseId: string) => void;
};

export function SplitCard({ input, toolUseId, onDevelopFirst, onKeepTalking }: Props) {
  const [a, b] = input.proposed_kinlooms;

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
        margin: '0 0 8px',
      }}>
        Two kinlooms here
      </p>
      <p style={{
        fontSize: 15,
        lineHeight: 1.6,
        color: 'var(--fg-3)',
        margin: '0 0 24px',
      }}>
        What you shared contains two distinct memories. Which would you like to develop first?
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {[a, b].map((k, i) => (
          <button
            key={i}
            onClick={() => onDevelopFirst(k, toolUseId)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 4,
              background: 'var(--background)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '18px 22px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'border-color 150ms ease',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <span style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 18,
              fontWeight: 400,
              color: 'var(--fg-1)',
              lineHeight: 1.3,
            }}>
              {k.working_title}
            </span>
            <span style={{
              fontSize: 14,
              lineHeight: 1.55,
              color: 'var(--fg-3)',
            }}>
              {k.one_line_summary}
            </span>
          </button>
        ))}
      </div>

      <button
        onClick={() => onKeepTalking(toolUseId)}
        className="text-btn text-btn--link text-btn--underline"
      >
        Keep talking instead
      </button>
    </div>
  );
}
