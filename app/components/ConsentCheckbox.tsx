'use client';

import { useId } from 'react';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  disabled?: boolean;
};

/**
 * Sign-up / re-consent agreement checkbox.
 *
 * The label wording is a legal promise — do not paraphrase it.
 *
 * The links live inside the <label> so they're part of the checkbox's
 * accessible name. Per the HTML spec, clicking interactive content (an <a>)
 * inside a label does not run the label's activation behaviour, so following
 * a link never toggles the box.
 */
export function ConsentCheckbox({ checked, onChange, id, disabled }: Props) {
  const autoId = useId();
  const inputId = id ?? `consent-${autoId}`;

  return (
    <div className="consent-check">
      <input
        id={inputId}
        type="checkbox"
        className="consent-check__box"
        checked={checked}
        disabled={disabled}
        onChange={e => onChange(e.target.checked)}
      />
      <label htmlFor={inputId} className="consent-check__label">
        I am 18 or older, and I agree to the{' '}
        <a href="https://kinloom.com/terms-of-use" target="_blank" rel="noopener noreferrer" className="consent-check__link">
          Kinloom Terms of Use
        </a>{' '}
        and{' '}
        <a href="https://kinloom.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="consent-check__link">
          Trust &amp; Privacy Policy
        </a>
        .
      </label>
    </div>
  );
}
