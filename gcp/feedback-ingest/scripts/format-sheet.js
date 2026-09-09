/**
 * Format an existing review spreadsheet: rename tab, write headers, freeze row 1.
 */

const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
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

async function main() {
  if (!SPREADSHEET_ID) {
    throw new Error('SPREADSHEET_ID is required');
  }

  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const authClient = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const first = meta.data.sheets[0].properties;
  const sheetId = first.sheetId;

  const requests = [];
  const neededCols = HEADERS.length;
  const currentCols = first.gridProperties.columnCount || 26;
  if (currentCols < neededCols) {
    requests.push({
      appendDimension: {
        sheetId,
        dimension: 'COLUMNS',
        length: neededCols - currentCols,
      },
    });
  }
  if (first.title !== 'Feedback') {
    requests.push({
      updateSheetProperties: {
        properties: { sheetId, title: 'Feedback' },
        fields: 'title',
      },
    });
  }
  requests.push(
    {
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: { frozenRowCount: 1 },
        },
        fields: 'gridProperties.frozenRowCount',
      },
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
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
        range: { sheetId, dimension: 'COLUMNS', startIndex: 2, endIndex: 4 },
        properties: { pixelSize: 280 },
        fields: 'pixelSize',
      },
    },
    {
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: 7, endIndex: 8 },
        properties: { pixelSize: 220 },
        fields: 'pixelSize',
      },
    },
    {
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: 27, endIndex: 28 },
        properties: { pixelSize: 360 },
        fields: 'pixelSize',
      },
    },
  );

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests },
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Feedback!A1',
    valueInputOption: 'RAW',
    requestBody: { values: [HEADERS] },
  });

  console.log('formatted', SPREADSHEET_ID);
}

main().catch(err => {
  console.error(err.response?.data || err.message || err);
  process.exit(1);
});
