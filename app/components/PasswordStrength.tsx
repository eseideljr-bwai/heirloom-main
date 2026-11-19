'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  evaluatePassword,
  loadStrengthChecker,
  MIN_SCORE,
  personalParts,
  type PasswordCheck,
  type Score,
  type StrengthChecker,
} from '../../lib/password-policy';

/**
 * Checks a new password against the shared rules as it's typed. `personal`
 * is the person's name and email, which the password mustn't contain.
 */
export function usePasswordPolicy(
  password: string,
  personal: (string | null | undefined)[],
): PasswordCheck {
  const [checker, setChecker] = useState<StrengthChecker | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    loadStrengthChecker()
      .then(c => { if (active) setChecker(() => c); })
      .catch(err => {
        console.warn('[password] strength checker failed to load', err);
        if (active) setFailed(true);
      });
    return () => { active = false; };
  }, []);

  // Keyed on the values, not the array, which is new on every render.
  const key = personal.map(v => v ?? '').join('\n');
  const parts = useMemo(() => personalParts(key.split('\n')), [key]);

  return useMemo(
    () => evaluatePassword(
      password,
      parts,
      checker && password ? checker(password, parts) : null,
      failed,
    ),
    [password, parts, checker, failed],
  );
}

const LEVELS: Record<Score, { label: string; tone: 'weak' | 'fair' | 'good' }> = {
  0: { label: 'Too weak', tone: 'weak' },
  1: { label: 'Too weak', tone: 'weak' },
  2: { label: 'Fair', tone: 'fair' },
  3: { label: 'Good', tone: 'good' },
  4: { label: 'Strong', tone: 'good' },
};

/**
 * The strength meter and the rule checklist, shown under the new-password
 * field. The checklist shows from the start so the rules are known before
 * typing; the meter appears with the first character.
 */
export function PasswordStrength({ password, check, id }: { password: string; check: PasswordCheck; id?: string }) {
  const { strength, rules } = check;
  const level = strength ? LEVELS[strength.score] : null;
  const filled = strength ? Math.max(1, strength.score) : 0;
  // zxcvbn's hint, only while the score is short; the common rule says the rest.
  const hint = strength && strength.score < MIN_SCORE && !strength.common ? strength.warning : null;

  return (
    <div className="pw-strength" id={id} aria-live="polite">
      {password && (
        <div className="pw-strength__meter-row">
          <div className={`pw-strength__meter${level ? ` pw-strength__meter--${level.tone}` : ''}`} aria-hidden="true">
            {[1, 2, 3, 4].map(i => (
              <span key={i} className={`pw-strength__seg${i <= filled ? ' is-on' : ''}`} />
            ))}
          </div>
          <span className="pw-strength__label">
            {level ? level.label : 'Checking…'}
          </span>
        </div>
      )}
      {hint && <p className="pw-strength__hint">{hint}</p>}
      <ul className="pw-strength__rules">
        {rules.map(r => (
          <li key={r.id} className={`pw-strength__rule${r.met ? ' is-met' : ''}`}>
            <span className="pw-strength__mark" aria-hidden="true">
              {r.met ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              ) : null}
            </span>
            <span>{r.label}</span>
            <span className="sr-only">{r.met ? ' (done)' : ' (not yet)'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
