/**
 * File-size thresholds for the Biographer import track.
 *
 * Both values are set by Eric before this feature goes live.
 * Change them here — nothing else needs to be touched.
 */

/**
 * Above this word count the Biographer switches to sectioning mode:
 * it works through the document chapter-by-chapter rather than in
 * a single pass.  Discussed range: ~8,000–10,000 words.
 */
export const BIOGRAPHER_SOFT_WORD_LIMIT = 10_000;

/**
 * Above this word count the Biographer stops and asks the user to
 * confirm before proceeding — even sectioning becomes unwieldy past
 * this point.  Discussed range: ~40,000–50,000 words.
 */
export const BIOGRAPHER_HARD_WORD_LIMIT = 50_000;
