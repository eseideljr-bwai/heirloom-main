/**
 * HTTP Cloud Function: ingest a FeedbackReport, store the screenshot in GCS,
 * append a row to the review spreadsheet.
 *
 * Auth: Firebase ID token in Authorization: Bearer <token>.
 * Identity on the row always comes from the token, not the client body.
 */

const { http } = require('@google-cloud/functions-framework');
const { Storage } = require('@google-cloud/storage');
const admin = require('firebase-admin');
const { google } = require('googleapis');

const PROJECT_ID = process.env.PROJECT_ID || 'bw-heirloom-dev';
const BUCKET = process.env.BUCKET || 'bw-heirloom-feedback-dev';
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME || 'Feedback';

const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024;
const MAX_JSON_BYTES = 100 * 1024;
const MAX_DESCRIPTION_CHARS = 5000;
const ALLOWED_IMAGE_TYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRTUVWXYZ2346789';
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ALLOWED_ORIGINS = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://heirloom-main-dev-5lodyywmxq-ue.a.run.app',
]);

if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}

const storage = new Storage();
const sheetsAuth = new google.auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

function setCors(req, res) {
  const origin = req.get('Origin');
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
  }
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set(
    'Access-Control-Allow-Headers',
    'Authorization, Content-Type',
  );
  res.set('Access-Control-Max-Age', '3600');
}

function json(res, status, body) {
  res.status(status).json(body);
}

function referenceCode() {
  const bytes = require('crypto').randomBytes(4);
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += REFERENCE_ALPHABET[bytes[i] % REFERENCE_ALPHABET.length];
  }
  return `KL-${out}`;
}

function asString(value, fallback = '') {
  if (value == null) return fallback;
  if (typeof value === 'string') return value;
  return String(value);
}

function asNullableString(value) {
  if (value == null || value === '') return '';
  return asString(value);
}

function flattenMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return '';
  return messages
    .slice()
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
    .map(m => {
      const role = m && m.role === 'assistant' ? 'Assistant' : 'User';
      return `${role}: ${asString(m && m.content)}`;
    })
    .join('\n\n');
}

function flattenErrors(errors) {
  if (!Array.isArray(errors) || errors.length === 0) return '';
  return errors.map(e => asString(e)).join('\n');
}

function boolCell(value) {
  return value === true ? 'Yes' : 'No';
}

async function verifyCaller(req) {
  const header = req.get('Authorization') || '';
  const match = header.match(/^Bearer\s+(\S+)$/i);
  if (!match) {
    const err = new Error('Missing bearer token.');
    err.status = 401;
    throw err;
  }
  try {
    return await admin.auth().verifyIdToken(match[1]);
  } catch {
    const err = new Error('Invalid or expired token.');
    err.status = 401;
    throw err;
  }
}

function decodeScreenshot(body) {
  const raw = body.screenshot_base64;
  if (raw == null || raw === '') return null;

  if (typeof raw !== 'string' || raw.length > MAX_SCREENSHOT_BYTES * 2) {
    const err = new Error('Screenshot is too large.');
    err.status = 413;
    throw err;
  }

  const contentType = asString(body.screenshot_content_type, 'image/png');
  const ext = ALLOWED_IMAGE_TYPES[contentType];
  if (!ext) {
    const err = new Error('Screenshot must be png, jpeg, or webp.');
    err.status = 400;
    throw err;
  }

  const buffer = Buffer.from(raw, 'base64');
  if (buffer.length === 0 || buffer.length > MAX_SCREENSHOT_BYTES) {
    const err = new Error('Screenshot is too large.');
    err.status = 413;
    throw err;
  }

  return { buffer, contentType, ext };
}

async function uploadScreenshot(reportId, shot) {
  if (!shot) return '';
  const objectPath = `feedback/${reportId}/screenshot.${shot.ext}`;
  const file = storage.bucket(BUCKET).file(objectPath);
  await file.save(shot.buffer, {
    resumable: false,
    metadata: {
      contentType: shot.contentType,
      cacheControl: 'private, max-age=0',
    },
  });
  return `https://storage.cloud.google.com/${BUCKET}/${objectPath}`;
}

function buildRow({ report, token, reference, screenshotUrl }) {
  const submittedAt = new Date().toISOString();
  return [
    submittedAt,
    reference,
    asString(report.title),
    asString(report.summary),
    asString(report.category),
    asString(report.area),
    asString(report.severity),
    screenshotUrl,
    asString(token.email),
    asString(token.uid),
    boolCell(report.follow_up_ok),
    boolCell(report.contains_personal_content),
    asNullableString(report.route),
    asNullableString(report.surface),
    asNullableString(report.environment),
    asNullableString(report.app_version),
    asNullableString(report.os),
    asNullableString(report.viewport),
    asNullableString(report.locale),
    asNullableString(report.timezone),
    asNullableString(report.active_track),
    asNullableString(report.active_agent_session_id),
    asNullableString(report.submission_mode),
    asNullableString(report.steps),
    asNullableString(report.expected),
    asNullableString(report.actual),
    flattenErrors(report.client_errors),
    flattenMessages(report.messages),
    asString(report.id),
    asNullableString(report.correlation_id),
    asNullableString(report.user_agent),
  ];
}

async function appendRow(row) {
  if (!SPREADSHEET_ID) {
    const err = new Error('Spreadsheet is not configured.');
    err.status = 500;
    throw err;
  }
  const auth = await sheetsAuth.getClient();
  const sheets = google.sheets({ version: 'v4', auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });
}

http('ingestFeedback', async (req, res) => {
  setCors(req, res);

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    json(res, 405, { error: 'POST only.' });
    return;
  }

  try {
    const token = await verifyCaller(req);
    const body = req.body && typeof req.body === 'object' ? req.body : {};

    const claimedUid = asString(body.uid).trim();
    if (claimedUid && claimedUid !== token.uid) {
      json(res, 403, { error: 'uid does not match caller.' });
      return;
    }

    const { screenshot_base64, screenshot_content_type, ...reportFields } =
      body;
    const jsonBytes = Buffer.byteLength(JSON.stringify(reportFields), 'utf8');
    if (jsonBytes > MAX_JSON_BYTES) {
      json(res, 413, { error: 'Payload is too large.' });
      return;
    }

    const description = (
      asString(body.description).trim() || asString(body.summary).trim()
    ).slice(0, MAX_DESCRIPTION_CHARS);
    const title = asString(body.title).trim() || description.slice(0, 80);
    if (!description) {
      json(res, 422, { error: 'description is required.' });
      return;
    }

    const id = UUID_RE.test(asString(body.id))
      ? asString(body.id)
      : require('crypto').randomUUID();

    const report = { ...body, id, title, summary: description };
    const shot = decodeScreenshot({
      screenshot_base64,
      screenshot_content_type,
    });
    const screenshotUrl = await uploadScreenshot(id, shot);
    const reference = referenceCode();

    await appendRow(
      buildRow({
        report,
        token,
        reference,
        screenshotUrl,
      }),
    );

    json(res, 200, { id, reference });
  } catch (err) {
    const status = err && err.status ? err.status : 500;
    if (status >= 500) {
      console.error('[feedback-ingest]', err);
    }
    json(res, status, {
      error: status >= 500 ? 'Failed to record feedback.' : err.message,
    });
  }
});
