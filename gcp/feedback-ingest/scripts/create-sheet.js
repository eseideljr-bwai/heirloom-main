/**
 * One-off: create the review spreadsheet and share it.
 * Run with GOOGLE_APPLICATION_CREDENTIALS pointing at a SA key.
 */

const { google } = require('googleapis');

const HEADERS = [
  'Submitted',
  'Reference',
  'Title',
  'Summary',
  'Category',
  'Area',
  'Severity',
  'Screenshot',
  'User email',
  'User id',
  'Follow up OK',
  'Personal content',
  'Route',
  'Surface',
  'Environment',
  'App version',
  'OS',
  'Viewport',
  'Locale',
  'Timezone',
  'Track',
  'Session',
  'Submission mode',
  'Steps',
  'Expected',
  'Actual',
  'Client errors',
  'Transcript',
  'Report ID',
  'Correlation ID',
  'User agent',
];

const SHARE_WITH = (process.env.SHEET_SHARE_EMAILS || 'jaccsoft@gmail.com')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

async function main() {
  const auth = new google.auth.GoogleAuth({
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  });
  const authClient = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: authClient });
  const drive = google.drive({ version: 'v3', auth: authClient });

  const created = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: 'Kinloom Feedback (dev)' },
      sheets: [
        {
          properties: {
            title: 'Feedback',
            gridProperties: { frozenRowCount: 1 },
          },
        },
      ],
    },
  });

  const spreadsheetId = created.data.spreadsheetId;
  const spreadsheetUrl = created.data.spreadsheetUrl;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Feedback!A1',
    valueInputOption: 'RAW',
    requestBody: { values: [HEADERS] },
  });

  const sheetId = created.data.sheets[0].properties.sheetId;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
            },
            cell: {
              userEnteredFormat: {
                textFormat: { bold: true },
                backgroundColor: { red: 0.93, green: 0.91, blue: 0.87 },
              },
            },
            fields: 'userEnteredFormat(textFormat,backgroundColor)',
          },
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: 'COLUMNS',
              startIndex: 2,
              endIndex: 4,
            },
            properties: { pixelSize: 280 },
            fields: 'pixelSize',
          },
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: 'COLUMNS',
              startIndex: 7,
              endIndex: 8,
            },
            properties: { pixelSize: 220 },
            fields: 'pixelSize',
          },
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: 'COLUMNS',
              startIndex: 27,
              endIndex: 28,
            },
            properties: { pixelSize: 360 },
            fields: 'pixelSize',
          },
        },
      ],
    },
  });

  for (const email of SHARE_WITH) {
    await drive.permissions.create({
      fileId: spreadsheetId,
      sendNotificationEmail: true,
      requestBody: {
        type: 'user',
        role: 'writer',
        emailAddress: email,
      },
    });
  }

  console.log(JSON.stringify({ spreadsheetId, spreadsheetUrl }, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
