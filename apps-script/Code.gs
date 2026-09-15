/**
 * Google Apps Script web app for Meltemi Rentals booking requests.
 *
 * POST: checks availability, appends one row per request and sends the prepared emails.
 * GET ?action=availability&pickup=YYYY-MM-DD&dropoff=YYYY-MM-DD: booked cars per category.
 * GET ?action=find&ref=MR-XXXXX: whether a request has already been saved.
 *
 * Setup: Extensions > Apps Script in the target Google Sheet, paste this file,
 * Project Settings > Script properties: TOKEN = <same value as SHEETS_TOKEN on Vercel>,
 * then Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).
 * After editing: Deploy > Manage deployments > Edit > Version: New version (the URL stays the same).
 */

var SHEET_NAME = 'Αιτήματα';
var HEADERS = [
  'Αριθμός', 'Ημερομηνία αιτήματος', 'Όνομα', 'Email', 'Τηλέφωνο', 'Κατηγορία',
  'Παραλαβή', 'Επιστροφή', 'Μέρες', 'Τιμή/μέρα', 'Σύνολο', 'Σημείο', 'Σημείωση', 'Γλώσσα', 'Κατάσταση',
];
var COL = { ref: 0, category: 5, pickup: 6, dropoff: 7, status: 14 };
// Rows with these statuses no longer hold a car.
var INACTIVE = ['Ακυρώθηκε', 'Απορρίφθηκε', 'Cancelled', 'Rejected'];

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    if (!authorized(payload.token)) return json({ ok: false, error: 'unauthorized' });

    var r = payload.row;
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      var sheet = getSheet();
      // A retried request must not create a second row.
      if (findRow(sheet, r.ref)) return json({ ok: true, duplicate: true });

      if (payload.capacity) {
        var booked = bookedCounts(sheet, r.pickup, r.dropoff)[r.category] || 0;
        if (booked >= payload.capacity) return json({ ok: false, error: 'unavailable', booked: booked });
      }

      sheet.appendRow([
        r.ref, new Date(r.createdAt), r.name, r.email, r.phone, r.category,
        r.pickup, r.dropoff, r.days, r.pricePerDay, r.total, r.place, r.note, r.lang, 'Νέο',
      ]);
      SpreadsheetApp.flush();
    } finally {
      lock.releaseLock();
    }

    // The row is already saved: a bad address must not turn the request into a failure.
    var mailErrors = [];
    (payload.mails || []).forEach(function (m) {
      try {
        MailApp.sendEmail({
          to: m.to,
          subject: m.subject,
          body: m.text,
          htmlBody: m.html,
          name: m.fromName || 'Meltemi Rentals',
          replyTo: m.replyTo || undefined,
        });
      } catch (mailErr) {
        mailErrors.push(m.to + ': ' + String(mailErr));
      }
    });

    return json({ ok: true, mailErrors: mailErrors });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  // Opening the web app URL in a browser confirms the deployment is reachable.
  if (!p.action) return json({ ok: true, service: 'meltemi-booking-sheet' });
  if (!authorized(p.token)) return json({ ok: false, error: 'unauthorized' });

  try {
    var sheet = getSheet();
    if (p.action === 'availability') return json({ ok: true, booked: bookedCounts(sheet, p.pickup, p.dropoff) });
    if (p.action === 'find') return json({ ok: true, found: Boolean(findRow(sheet, p.ref)) });
    return json({ ok: false, error: 'unknown_action' });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function authorized(token) {
  var expected = PropertiesService.getScriptProperties().getProperty('TOKEN');
  return !expected || token === expected;
}

// Counts active bookings per category that overlap [pickup, dropoff). A return day is free for a new pick-up.
function bookedCounts(sheet, pickup, dropoff) {
  var counts = {};
  var tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    if (INACTIVE.indexOf(String(row[COL.status]).trim()) !== -1) continue;
    var start = isoDate(row[COL.pickup], tz);
    var end = isoDate(row[COL.dropoff], tz);
    if (!start || !end) continue;
    if (start < dropoff && end > pickup) {
      var category = String(row[COL.category]);
      counts[category] = (counts[category] || 0) + 1;
    }
  }
  return counts;
}

function findRow(sheet, ref) {
  if (!ref) return 0;
  var refs = sheet.getRange(1, COL.ref + 1, Math.max(sheet.getLastRow(), 1), 1).getValues();
  for (var i = 1; i < refs.length; i++) {
    if (refs[i][0] === ref) return i + 1;
  }
  return 0;
}

// Sheets turns "2026-07-10" into a Date, so read both forms back as YYYY-MM-DD.
function isoDate(value, tz) {
  if (value instanceof Date) return Utilities.formatDate(value, tz, 'yyyy-MM-dd');
  var s = String(value || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
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
