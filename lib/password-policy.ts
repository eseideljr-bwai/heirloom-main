/**
 * The password rules for every screen that sets one: sign-up, reset and
 * change password. Front end only: Firebase takes the password straight
 * from the browser, so these rules are a guide, not a guarantee. Firebase's
 * own password policy (console → Authentication → Settings) is what a
 * direct call to Firebase can't get around.
 *
 * Rules (NIST SP 800-63B style: length and guessability, no forced symbols):
 *   - at least PASSWORD_MIN_LENGTH characters;
 *   - not a common password or a variation of one;
 *   - doesn't contain your name or email;
 *   - strength (zxcvbn score) at least MIN_SCORE, "Good".
 */

export const PASSWORD_MIN_LENGTH = 12;

/** zxcvbn score 0–4. 3 is "safely unguessable" against online attacks. */
export const MIN_SCORE = 3;

export type Score = 0 | 1 | 2 | 3 | 4;

export type Strength = {
  score: Score;
  /** zxcvbn's own hint, e.g. "This is similar to a commonly used password." */
  warning: string | null;
  /** True when at least half the password comes from a common-password list. */
  common: boolean;
};

export type StrengthChecker = (password: string, personal: string[]) => Strength;

// The word lists are a few MB, so they load on the password screens only.
let loading: Promise<StrengthChecker> | null = null;

export function loadStrengthChecker(): Promise<StrengthChecker> {
  loading ??= (async () => {
    const [{ ZxcvbnFactory }, common, en] = await Promise.all([
      import('@zxcvbn-ts/core'),
      import('@zxcvbn-ts/language-common'),
      import('@zxcvbn-ts/language-en'),
    ]);
    const zxcvbn = new ZxcvbnFactory({
      dictionary: { ...common.dictionary, ...en.dictionary },
      graphs: common.adjacencyGraphs,
      translations: en.translations,
    });
    return (password: string, personal: string[]): Strength => {
      const result = zxcvbn.check(password, personal);
      let fromCommon = 0;
      for (const m of result.sequence) {
        if (m.pattern === 'dictionary' && String(m.dictionaryName).startsWith('passwords')) {
          fromCommon += m.j - m.i + 1;
        }
      }
      return {
        score: result.score as Score,
        warning: result.feedback.warning || null,
        common: password.length > 0 && fromCommon / password.length >= 0.5,
      };
    };
  })();
  // A failed load (offline, a stale deploy) may be retried on the next screen.
  loading.catch(() => { loading = null; });
  return loading;
}

/**
 * The pieces of a person's name and email a password mustn't contain:
 * lower case, four characters or more (shorter pieces such as "kin" or
 * "ann" would block ordinary words). "jane.smith+kin@x.com" and
 * "Jane Smith" give "jane.smith+kin", "jane" and "smith".
 */
export function personalParts(values: (string | null | undefined)[]): string[] {
  const parts = new Set<string>();
  for (const raw of values) {
    const value = raw?.trim().toLowerCase();
    if (!value) continue;
    const local = value.includes('@') ? value.slice(0, value.indexOf('@')) : value;
    if (value.includes('@') && local.length >= 4) parts.add(local);
    for (const piece of local.split(new RegExp('[^\\p{L}\\p{N}]+', 'u'))) {
      if (piece.length >= 4) parts.add(piece);
    }
  }
  return Array.from(parts);
}

export type RuleId = 'length' | 'common' | 'personal' | 'strength';

export type PasswordRule = {
  id: RuleId;
  label: string;
  /** null while the strength checker is still loading. */
  met: boolean | null;
};

export type PasswordCheck = {
  rules: PasswordRule[];
  /** null until the strength checker has loaded, or if it couldn't. */
  strength: Strength | null;
  /** Every rule met and the strength at least MIN_SCORE. */
  ok: boolean;
  /** What to tell someone who submits anyway; null when `ok`. */
  problem: string | null;
};

/**
 * `strength` null with `checkerFailed` false means "still loading": not ok.
 * If the checker couldn't load at all, length and personal info still apply,
 * so nobody is locked out of signing up by a failed download.
 */
export function evaluatePassword(
  password: string,
  personal: string[],
  strength: Strength | null,
  checkerFailed: boolean,
): PasswordCheck {
  const lower = password.toLowerCase();
  const longEnough = password.length >= PASSWORD_MIN_LENGTH;
  const personalFree = !personal.some(p => lower.includes(p));
  const notCommon = strength ? !strength.common : null;

  const rules: PasswordRule[] = [
    { id: 'length', label: `At least ${PASSWORD_MIN_LENGTH} characters`, met: longEnough },
    { id: 'common', label: 'Not a common password', met: password ? notCommon : false },
    { id: 'personal', label: "Doesn't include your name or email", met: password ? personalFree : false },
    { id: 'strength', label: 'Strength is Good or better', met: password ? (strength ? strength.score >= MIN_SCORE : null) : false },
  ];
  // Without the checker there's nothing to judge these two by.
  const shown = checkerFailed ? rules.filter(r => r.id !== 'common' && r.id !== 'strength') : rules;

  let problem: string | null = null;
  if (!longEnough) problem = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  else if (!personalFree) problem = "Password can't include your name or email.";
  else if (strength?.common) problem = 'That password is too common. Choose something less predictable.';
  else if (strength && strength.score < MIN_SCORE) problem = 'That password is too easy to guess. Try a longer phrase of unrelated words.';
  else if (!strength && !checkerFailed) problem = 'Still checking your password. Try again in a moment.';

  return { rules: shown, strength, ok: problem === null, problem };
}
