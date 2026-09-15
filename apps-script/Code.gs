/**
 * Google Apps Script web app: receives booking requests from /api/request,
 * appends one row per request to the sheet and (optionally) sends the prepared emails.
 *
 * Setup: Extensions > Apps Script in the target Google Sheet, paste this file,
 * Project Settings > Script properties: TOKEN = <same value as SHEETS_TOKEN on Vercel>,
 * then Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).
 */

var SHEET_NAME = 'Αιτήματα';
var HEADERS = [
  'Αριθμός', 'Ημερομηνία αιτήματος', 'Όνομα', 'Email', 'Τηλέφωνο', 'Κατηγορία',
  'Παραλαβή', 'Επιστροφή', 'Μέρες', 'Τιμή/μέρα', 'Σύνολο', 'Σημείο', 'Σημείωση', 'Γλώσσα', 'Κατάσταση',
];

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var token = PropertiesService.getScriptProperties().getProperty('TOKEN');
    if (token && payload.token !== token) return json({ ok: false, error: 'unauthorized' });

    var r = payload.row;
    var sheet = getSheet();
    sheet.appendRow([
      r.ref, new Date(r.createdAt), r.name, r.email, r.phone, r.category,
      r.pickup, r.dropoff, r.days, r.pricePerDay, r.total, r.place, r.note, r.lang, 'Νέο',
    ]);

    (payload.mails || []).forEach(function (m) {
      MailApp.sendEmail({
        to: m.to,
        subject: m.subject,
        body: m.text,
        htmlBody: m.html,
        name: m.fromName || 'Meltemi Rentals',
        replyTo: m.replyTo || undefined,
      });
    });

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
