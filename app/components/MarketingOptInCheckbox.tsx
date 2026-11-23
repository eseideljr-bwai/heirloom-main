'use client';

import { useId } from 'react';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

/**
 * Optional marketing-email opt-in at sign-up. Unchecked by default and never
 * required. Wording approved (Eric, Dan) — don't paraphrase it.
 *
 * Same markup as ConsentCheckbox: the link sits inside the label, and
 * following it never toggles the box.
 */
export function MarketingOptInCheckbox({ checked, onChange }: Props) {
  const inputId = `marketing-${useId()}`;
  return (
    <div className="consent-check">
      <input
        id={inputId}
        type="checkbox"
        className="consent-check__box"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
      <label htmlFor={inputId} className="consent-check__label">
        Send me emails about Kinloom news, tips and offers.{' '}
        <a href="https://kinloom.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="consent-check__link">
          Privacy Policy
        </a>
      </label>
    </div>
  );
}
