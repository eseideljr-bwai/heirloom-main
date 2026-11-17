/**
 * ─────────────────────────────────────────────────────────────────────────
 *  THIS MODULE IS THE ONLY PLACE A FEEDBACK REQUEST WILL EVER BE INTRODUCED.
 *
 *  No component may construct or send one directly. Callers already await
 *  Promise<FeedbackReceipt> and handle rejection — keep it that way.
 * ─────────────────────────────────────────────────────────────────────────
 */

import type { FeedbackReceipt, FeedbackReport } from './types';

export async function submitFeedbackReport(
  report: FeedbackReport,
  screenshot?: Blob | null,
): Promise<FeedbackReceipt> {
  const form = new FormData();
  form.append(
    'report',
    JSON.stringify({
      ...report,
      // v0.4 names. The function accepts both; identity still comes from
      // the Firebase token, not these fields.
      description: report.summary,
      page: report.route,
      console_errors: report.client_errors,
    }),
  );

  if (screenshot && screenshot.size > 0) {
    const name = screenshot instanceof File ? screenshot.name : 'screenshot.png';
    form.append('screenshot', screenshot, name);
  }

  const res = await fetch('/api/feedback', {
    method: 'POST',
    body: form,
    credentials: 'same-origin',
  });

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    throw new Error('Feedback submit failed.');
  }

  const body = payload as { id?: unknown; reference?: unknown };
  if (typeof body.id !== 'string' || typeof body.reference !== 'string') {
    throw new Error('Feedback submit returned an invalid receipt.');
  }

  return { id: body.id, reference: body.reference };
}
