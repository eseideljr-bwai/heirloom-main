/**
 * The feedback payload contract.
 *
 * THIS IS A LOCKED CONTRACT. The UI defines this shape; whatever consumes it
 * later conforms to this, not the other way round. Do not add fields, rename
 * fields, or change casing without an explicit decision to revise the
 * contract — a field added here quietly becomes a field someone downstream
 * has to support forever.
 *
 * Nothing in this build sends a FeedbackReport anywhere. It goes to the mock
 * adapter in ./submit.ts, which logs it.
 */

export type FeedbackEnvironment = 'dev' | 'preview' | 'prod';

export type FeedbackTrack = 'talk' | 'write' | 'record' | 'import';

export type FeedbackCategory =
  | 'bug'
  | 'usability'
  | 'feature_request'
  | 'content_quality'
  | 'performance'
  | 'praise'
  | 'other';

export type FeedbackArea =
  | 'creation_talk'
  | 'creation_write'
  | 'creation_record'
  | 'creation_import'
  | 'library'
  | 'family_space'
  | 'legacy_bank'
  | 'account_auth'
  | 'invites'
  | 'media'
  | 'billing'
  | 'other'
  | 'unknown';

export type FeedbackSeverity = 'blocker' | 'major' | 'minor' | 'cosmetic';

export type FeedbackSubmissionMode = 'agent' | 'fallback_form';

/**
 * One turn of the conversation, verbatim. `sequence` is 0-based and dense —
 * it is the authoritative order, not the array index, so a consumer that
 * re-sorts or stores these rows individually can still rebuild the exchange.
 */
export type FeedbackMessage = {
  role: 'user' | 'assistant';
  content: string;
  sequence: number;
};

export type FeedbackReport = {
  /** uuid, generated on the client when the sheet opens. */
  id: string;

  // ─── Environment snapshot, taken when the sheet opens ────────────────────
  environment: FeedbackEnvironment;
  app_version: string | null;
  /** Pathname with query params stripped — they can carry kinloom ids. */
  route: string | null;
  surface: string | null;
  user_agent: string | null;
  viewport: string | null;
  os: string | null;
  locale: string | null;
  timezone: string | null;
  correlation_id: string | null;

  // ─── What the user was doing ─────────────────────────────────────────────
  active_track: FeedbackTrack | null;
  active_agent_session_id: string | null;
  /** Ring buffer of the last 5 client errors seen before the sheet opened. */
  client_errors: string[] | null;

  // ─── The report itself ───────────────────────────────────────────────────
  category: FeedbackCategory;
  area: FeedbackArea;
  severity: FeedbackSeverity;
  title: string;
  summary: string;
  steps: string | null;
  expected: string | null;
  actual: string | null;

  contains_personal_content: boolean;
  follow_up_ok: boolean;

  submission_mode: FeedbackSubmissionMode;
  /** The complete verbatim transcript. Empty on the fallback-form path. */
  messages: FeedbackMessage[];
};

/**
 * The subset of the report captured automatically. Derived from the report
 * type on purpose — it cannot drift out of sync with the contract.
 */
export type FeedbackMetadata = Pick<
  FeedbackReport,
  | 'id'
  | 'environment'
  | 'app_version'
  | 'route'
  | 'surface'
  | 'user_agent'
  | 'viewport'
  | 'os'
  | 'locale'
  | 'timezone'
  | 'correlation_id'
  | 'active_track'
  | 'active_agent_session_id'
  | 'client_errors'
>;

/** What the adapter resolves with once a report is accepted. */
export type FeedbackReceipt = {
  id: string;
  reference: string;
};
