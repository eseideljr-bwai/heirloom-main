'use client';

/**
 * BiographerChoiceCard — rendered when the Biographer calls ask_choices.
 *
 * A mid-conversation elicitation card: each question renders with its label
 * and a row of tappable option buttons. Supports multiple questions, each
 * with its own button group. On submit, the parent assembles the chosen
 * option(s) into a tool_result and continues the conversation.
 *
 * After submission the card is disabled and the chosen option(s) stay
 * highlighted so the transcript preserves what the user picked.
 */

import { useState } from 'react';

export type ChoiceQuestion = {
  question: string;
  options: string[];
};

export type ChoicesInput = {
  questions: ChoiceQuestion[];
};

type Props = {
  toolUseId: string;
  input: ChoicesInput;
  /** Provided once the user has answered every question, mid-conversation. */
  onSubmit: (toolUseId: string, answers: string[]) => void;
  /**
   * The tool_result content once this card has been answered. Its presence
   * locks the card. Chosen options are recovered by matching this text
   * against each question's options; if the user typed a free-text reply
   * instead of tapping, nothing matches and the text is shown as a caption.
   */
  answerText?: string;
};

export function BiographerChoiceCard({ input, toolUseId, onSubmit, answerText }: Props) {
  const questions = input.questions ?? [];
  // Live selection per question index (before submit).
  const [selected, setSelected] = useState<Array<string | null>>(
    () => questions.map(() => null),
  );

  const locked = answerText != null;
  // When locked, recover the chosen option per question from the answer text.
  const picks = locked
    ? questions.map(q => q.options.find(o => answerText.includes(o)) ?? null)
    : selected;
  const matchedAny = locked && picks.some(p => p != null);
  const allAnswered = questions.length > 0 && selected.every(s => !!s);

  // A single-question card commits the moment an option is tapped — no
  // second "Continue" tap. Multi-question cards wait for every answer.
  const singleQuestion = questions.length === 1;

  const handlePick = (qi: number, option: string) => {
    if (locked) return;
    if (singleQuestion) {
      onSubmit(toolUseId, [option]);
      return;
    }
    setSelected(prev => {
      const next = [...prev];
      next[qi] = option;
      return next;
    });
  };

  const handleSubmit = () => {
    if (locked || !allAnswered) return;
    onSubmit(toolUseId, selected.map(s => s ?? ''));
  };

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 12,
        background: 'var(--card)',
        padding: '28px 32px',
        marginBottom: 48,
        opacity: locked ? 0.85 : 1,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {questions.map((q, qi) => (
          <div key={qi}>
            <p
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 17,
                lineHeight: 1.5,
                color: 'var(--fg-1)',
                margin: '0 0 14px',
              }}
            >
              {q.question}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {q.options.map((option, oi) => {
                const isChosen = picks[qi] === option;
                return (
                  <button
                    key={oi}
                    type="button"
                    disabled={locked}
                    onClick={() => handlePick(qi, option)}
                    style={{
                      background: isChosen ? 'var(--primary)' : 'none',
                      color: isChosen ? 'var(--primary-foreground)' : 'var(--fg-2)',
                      border: `1px solid ${isChosen ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: 8,
                      padding: '10px 20px',
                      fontSize: 14,
                      fontWeight: 500,
                      fontFamily: 'inherit',
                      cursor: locked ? 'default' : 'pointer',
                      transition: 'background 120ms ease, border-color 120ms ease, color 120ms ease',
                    }}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {locked && !matchedAny && answerText && (
        <p
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 15,
            fontStyle: 'italic',
            lineHeight: 1.6,
            color: 'var(--fg-3)',
            margin: '20px 0 0',
          }}
        >
          You replied: “{answerText}”
        </p>
      )}

      {!locked && !singleQuestion && (
        <div style={{ marginTop: 28 }}>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!allAnswered}
            style={{
              background: 'var(--primary)',
              color: 'var(--primary-foreground)',
              border: 'none',
              borderRadius: 8,
              padding: '10px 22px',
              fontSize: 14,
              fontWeight: 500,
              fontFamily: 'inherit',
              cursor: allAnswered ? 'pointer' : 'not-allowed',
              opacity: allAnswered ? 1 : 0.5,
              transition: 'opacity 150ms ease',
            }}
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
