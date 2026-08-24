/**
 * ─────────────────────────────────────────────────────────────────────────
 *  THIS MODULE IS THE ONLY PLACE A FEEDBACK REQUEST WILL EVER BE INTRODUCED.
 *
 *  No component may construct or send one directly. When this stops being a
 *  mock, the change happens here and nowhere else — every caller already
 *  awaits a Promise<FeedbackReceipt> and handles rejection, so swapping the
 *  body of submitFeedbackReport is the whole migration.
 *
 *  Right now it makes NO network call. It logs the payload and invents a
 *  reference code.
 * ─────────────────────────────────────────────────────────────────────────
 */

import type { FeedbackReceipt, FeedbackReport } from './types';

/**
 * Ambiguous glyphs (I/1, O/0, S/5) are left out — this code gets read aloud
 * and typed back in from a screenshot.
 */
const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRTUVWXYZ2346789';

function referenceCode(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += REFERENCE_ALPHABET[bytes[i] % REFERENCE_ALPHABET.length];
  }
  return `KL-${out}`;
}

/**
 * Accepts a report and resolves with its receipt.
 *
 * The short delay is deliberate: it keeps the submitting state on screen long
 * enough to be real, so the pending and disabled treatments are exercised in
 * the mock exactly as they will be against a server.
 */
export async function submitFeedbackReport(
  report: FeedbackReport,
): Promise<FeedbackReceipt> {
  // eslint-disable-next-line no-console
  console.log('[feedback] submit (mock — nothing was sent)', report);

  await new Promise(resolve => setTimeout(resolve, 400));

  return { id: report.id, reference: referenceCode() };
}
