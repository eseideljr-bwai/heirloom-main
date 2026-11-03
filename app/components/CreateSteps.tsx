/**
 * The four-step indicator that runs across the whole create flow:
 * Begin → Capture → Who can see it → Finalize.
 *
 * Step 2 is relabelled with the chosen mode once one is picked, exactly
 * as the design does — it reads "Capture" on the chooser and "Talk",
 * "Write" or "Import" from then on.
 */

export type CreateStepIndex = 0 | 1 | 2 | 3;
export type CaptureMode = 'talk' | 'write' | 'import';

const CAPTURE_LABEL: Record<CaptureMode, string> = {
  talk: 'Talk',
  write: 'Write',
  import: 'Import',
};

export default function CreateSteps({
  active,
  mode,
}: {
  active: CreateStepIndex;
  /** Omitted on the chooser, where the step is still just "Capture". */
  mode?: CaptureMode;
}) {
  const labels = [
    'Begin',
    mode ? CAPTURE_LABEL[mode] : 'Capture',
    'Who can see it',
    'Finalize',
  ];

  return (
    <ol className="create-steps">
      {labels.map((label, i) => {
        const state = i === active ? ' is-current' : i < active ? ' is-done' : '';
        return (
          <li
            key={label}
            className={`create-step${state}`}
            aria-current={i === active ? 'step' : undefined}
          >
            <span className="create-step__num" aria-hidden="true">
              {i < active ? '✓' : i + 1}
            </span>
            <span className="create-step__label">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
