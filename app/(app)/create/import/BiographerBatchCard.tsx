'use client';

/**
 * BiographerBatchCard — rendered when the Biographer calls split_into_multiple.
 *
 * Checkpoint 3: shows the proposed kinloom list with a "Keep refining" escape.
 * Checkpoint 4: adds accept / drop / edit per-kinloom and the full handoff.
 */

export type ProposedKinloom = {
  working_title: string;
  one_line_summary: string;
  suggested_type_slug: string;
};

export type BatchInput = {
  proposed_kinlooms: ProposedKinloom[];
  reasoning?: string;
};

type Props = {
  toolUseId: string;
  input: BatchInput;
  onKeepRefining: (toolUseId: string) => void;
};

export function BiographerBatchCard({ input, toolUseId, onKeepRefining }: Props) {
  const { proposed_kinlooms: kinlooms } = input;

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 12,
        background: 'var(--card)',
        padding: '32px 36px',
        marginBottom: 48,
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--fg-4)',
          margin: '0 0 8px',
        }}
      >
        {kinlooms.length} kinloom{kinlooms.length === 1 ? '' : 's'} found
      </p>
      <p
        style={{
          fontSize: 15,
          lineHeight: 1.6,
          color: 'var(--fg-3)',
          margin: '0 0 24px',
        }}
      >
        The Biographer found these in the document. Review and save them in the next step.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        {kinlooms.map((k, i) => (
          <div
            key={i}
            style={{
              background: 'var(--background)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '16px 20px',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 17,
                fontWeight: 400,
                color: 'var(--fg-1)',
                lineHeight: 1.3,
                margin: '0 0 4px',
              }}
            >
              {k.working_title}
            </p>
            <p
              style={{
                fontSize: 13,
                lineHeight: 1.55,
                color: 'var(--fg-3)',
                margin: '0 0 6px',
              }}
            >
              {k.one_line_summary}
            </p>
            <p
              style={{
                fontSize: 11,
                color: 'var(--fg-4)',
                margin: 0,
                textTransform: 'capitalize',
              }}
            >
              {k.suggested_type_slug.replace('-', '‑')}
            </p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => onKeepRefining(toolUseId)}
          style={{
            background: 'none',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--fg-2)',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Keep refining
        </button>
      </div>
    </div>
  );
}
