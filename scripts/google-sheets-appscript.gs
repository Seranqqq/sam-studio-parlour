const SHEET_NAMES = {
  "sam-studio": "Sheet1",
  parlour: "Sheet2",
};

function doGet() {
  return jsonOutput_({ ok: true, message: "Billing sync endpoint is ready." });
}

function doPost(event) {
  try {
    const request = JSON.parse(event.postData.contents);
    const expectedToken = PropertiesService.getScriptProperties().getProperty("SYNC_TOKEN");
    if (!expectedToken || request.token !== expectedToken) {
      throw new Error("Unauthorized Apps Script request.");
    }

    const spreadsheet = getSpreadsheet_();
    if (request.action === "setup") {
      const sheet1 = getBusinessSheet_(spreadsheet, "sam-studio", "Sheet1");
      const sheet2 = getBusinessSheet_(spreadsheet, "parlour", "Sheet2");
      writeHeaders_(sheet1, request.headers);
      writeHeaders_(sheet2, request.headers);
      return jsonOutput_({
        ok: true,
        spreadsheetUrl: spreadsheet.getUrl(),
        sheets: [sheet1.getName(), sheet2.getName()],
      });
    }

    const sheet = getBusinessSheet_(spreadsheet, request.businessId, request.sheetName);
    if (request.action === "sync") {
      validateHeaders_(request.headers);
      validateRows_(request.rows);
      writeRows_(sheet, request.headers, request.rows);
      return jsonOutput_({ ok: true, count: request.rows.length });
    }
    if (request.action === "upsert") {
      validateHeaders_(request.headers);
      validateRows_([request.row]);
      writeHeaders_(sheet, request.headers);
      upsertRow_(sheet, request.row);
      return jsonOutput_({ ok: true });
    }
    if (request.action === "delete") {
      if (!Array.isArray(request.ids) || !request.ids.every((id) => typeof id === "string")) {
        throw new Error("Invalid bill IDs.");
      }
      deleteRows_(sheet, request.ids);
      return jsonOutput_({ ok: true });
    }
    throw new Error("Unsupported Apps Script action.");
  } catch (error) {
    return jsonOutput_({
      ok: false,
      error: error instanceof Error ? error.message : "Apps Script request failed.",
    });
  }
}

function getSpreadsheet_() {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;

  const spreadsheetId = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (spreadsheetId) return SpreadsheetApp.openById(spreadsheetId);
  throw new Error("Bind this script to the target spreadsheet or set SPREADSHEET_ID in Script Properties.");
}

function getBusinessSheet_(spreadsheet, businessId, requestedName) {
  const expectedName = SHEET_NAMES[businessId];
  if (!expectedName || requestedName !== expectedName) {
    throw new Error("Business and sheet name do not match.");
  }
  const sheet = spreadsheet.getSheetByName(expectedName) || spreadsheet.insertSheet(expectedName);
  return sheet;
}

function validateRows_(rows) {
  if (!Array.isArray(rows) || rows.some((row) =>
    !Array.isArray(row) || row.length !== 20 || typeof row[0] !== "string" || !row[0])) {
    throw new Error("Invalid bill rows.");
  }
}

function validateHeaders_(headers) {
  if (!Array.isArray(headers) || headers.length !== 20
    || headers.some((header) => typeof header !== "string")) {
    throw new Error("Invalid sheet headers.");
  }
}

function writeHeaders_(sheet, headers) {
  validateHeaders_(headers);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
}

function safeCell_(value) {
  if (typeof value === "string" && /^[=+\-@]/.test(value)) return "'" + value;
  return value;
}

function writeRows_(sheet, headers, rows) {
  validateHeaders_(headers);
  const values = rows.map((row) => row.map(safeCell_));
  sheet.clearContents();
  const allValues = [headers, ...values];
  if (allValues.length) {
    sheet.getRange(1, 1, allValues.length, headers.length).setValues(allValues);
  }
}

function upsertRow_(sheet, row) {
  const safeRow = row.map(safeCell_);
  const lastRow = sheet.getLastRow();
  if (lastRow === 0) {
    sheet.getRange(1, 1, 1, safeRow.length).setValues([safeRow]);
    return;
  }
  const ids = sheet.getRange(1, 1, lastRow, 1).getValues();
  const rowIndex = ids.findIndex((values) => values[0] === row[0]);
  const targetRow = rowIndex >= 0 ? rowIndex + 1 : lastRow + 1;
  sheet.getRange(targetRow, 1, 1, safeRow.length).setValues([safeRow]);
}

function deleteRows_(sheet, ids) {
  if (!ids.length || sheet.getLastRow() < 2) return;
  const deleteIds = new Set(ids);
  const existing = sheet.getDataRange().getValues();
  const rows = existing.slice(1).filter((row) => !deleteIds.has(row[0]));
  writeRows_(sheet, existing[0], rows);
}

function jsonOutput_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
