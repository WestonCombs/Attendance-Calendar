/*
File: Helpers.gs
Author: Weston Combs
Created 5/7/26
*/

function getProjectVersion() {
  return PROJECT_VERSION;
}

function getShiftSections() {
  return SHIFT_SECTIONS.slice();
}

function getMasterOptions() {
  const options = [STATUS_IDLE, STATUS_WORKING, STATUS_ADD_COLUMNS];
  getShiftSections().forEach(function(section) {
    options.push(section.addLabel);
  });
  if (isDebugModeEnabled_()) {
    options.push(STATUS_CREATE_DOCUMENT);
    getShiftSections().forEach(function(section) {
      options.push(getDebugAddRowsLabel_(section));
    });
  }
  return options;
}

function getAddEmployeeActionMap() {
  const actionMap = {};
  getShiftSections().forEach(function(section) {
    actionMap[section.addLabel] = section.key;
  });
  return actionMap;
}

function getDebugAddRowsActionMap() {
  const actionMap = {};
  if (!isDebugModeEnabled_()) return actionMap;
  getShiftSections().forEach(function(section) {
    actionMap[getDebugAddRowsLabel_(section)] = section.key;
  });
  return actionMap;
}

function getAuditSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(AUDIT_SHEET_NAME);
}

function getAuditWidth() {
  const sheet = getAuditSheet();
  return sheet ? Math.max(sheet.getMaxColumns(), FIRST_ATTENDANCE_COLUMN) : 0;
}

function getAuditDataDepth() {
  const sheet = getAuditSheet();
  if (!sheet) return 0;
  const values = sheet.getRange(1, 1, sheet.getMaxRows(), Math.max(sheet.getLastColumn(), FIRST_ATTENDANCE_COLUMN)).getDisplayValues();
  for (let r = values.length - 1; r >= 0; r--) {
    if (values[r].some(function(value) { return value !== "" && value !== null; })) return r + 1;
  }
  return 0;
}

function initializeAuditSheet() {
  const sheet = getAuditSheet();
  if (!sheet) return;
  sheet.setFrozenColumns(0);
  ensureEnoughColumns_(sheet, FIRST_ATTENDANCE_COLUMN);
  normalizeTopRowLayout_(sheet);
  setupMasterSelector(sheet);
  writeGlobalHeaderRow(sheet);
  ensureShiftSections(sheet);
  resetStatus(sheet);
}

function setupMasterSelector(sheet) {
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(getMasterOptions(), true)
    .setAllowInvalid(false)
    .build();

  sheet.getRange(MASTER_CELL)
    .setDataValidation(rule)
    .setFontFamily(GLOBAL_FONT)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  formatStatusControl(sheet, String(sheet.getRange(MASTER_CELL).getValue() || STATUS_IDLE));
}

function runLockedAction(sheet, action) {
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(0)) {
    resetStatus(sheet);
    return false;
  }

  try {
    setStatus(sheet, STATUS_WORKING);
    action();
    return true;
  } catch (err) {
    setStatus(sheet, STATUS_ERROR);
    console.log(err && err.stack ? err.stack : err);
    return false;
  } finally {
    lock.releaseLock();
  }
}

function ensureShiftSections(sheet) {
  const existing = findSectionBounds(sheet).reduce(function(map, section) {
    map[section.key] = true;
    return map;
  }, {});

  getShiftSections().forEach(function(section) {
    if (existing[section.key]) return;
    const row = getConfiguredSectionInsertRow_(section);
    ensureEnoughRows_(sheet, row);
    if (rowHasAnyData_(sheet, row)) {
      sheet.insertRowsBefore(row, SECTION_TITLE_ROWS);
    }
    writeSectionSkeleton_(sheet, row, section);
  });
}

function findSectionBounds(sheet) {
  const width = Math.max(sheet.getLastColumn(), FIRST_ATTENDANCE_COLUMN);
  const lastRow = Math.max(sheet.getLastRow(), START_ROW);
  const values = sheet.getRange(1, 1, lastRow, width).getDisplayValues();
  const byTitle = getSectionByTitle_();
  const seen = {};
  const titles = [];

  for (let r = 0; r < values.length; r++) {
    const rowTitle = normalizeSectionTitle_(values[r][0]);
    const section = byTitle[rowTitle];
    if (section && !seen[section.key]) {
      seen[section.key] = true;
      titles.push({
        key: section.key,
        title: section.title,
        addLabel: section.addLabel,
        titleRow: r + 1
      });
    }
  }

  titles.sort(function(a, b) { return a.titleRow - b.titleRow; });
  const bottomRow = Math.max(getAuditDataDepth(), titles.length ? titles[titles.length - 1].titleRow + SECTION_HEADER_ROWS : START_ROW);

  return titles.map(function(section, index) {
    const nextTitleRow = index + 1 < titles.length ? titles[index + 1].titleRow : null;
    section.employeeStartRow = section.titleRow + SECTION_TITLE_ROWS;
    section.employeeEndRow = nextTitleRow ? nextTitleRow - 1 : Math.max(bottomRow, section.employeeStartRow - 1);
    section.numEmployeeRows = Math.max(0, section.employeeEndRow - section.employeeStartRow + 1);
    return section;
  });
}

function addEmployeeToSection(sheet, sectionKey) {
  ensureShiftSections(sheet);
  const bounds = findSectionBounds(sheet).filter(function(section) { return section.key === sectionKey; })[0];
  if (!bounds) throw new Error("No shift section found for key: " + sectionKey);

  const insertRow = bounds.employeeStartRow;
  const width = getAuditWidth();
  sheet.insertRowsBefore(insertRow, 1);

  const templateRow = findTemplateEmployeeRow_(sheet, bounds, insertRow);
  if (templateRow) {
    sheet.getRange(templateRow, 1, 1, width).copyTo(sheet.getRange(insertRow, 1, 1, width), { contentsOnly: false });
  } else {
    sheet.getRange(TABLE_HEADER_ROW, 1, 1, width).copyTo(sheet.getRange(insertRow, 1, 1, width), { formatOnly: true });
  }

  sheet.getRange(insertRow, 1, 1, width).clearContent();
  sheet.getRange(insertRow, SECTION_NAME_COLUMN).setValue(NEW_EMPLOYEE_PLACEHOLDER);
  sheet.getRange(insertRow, 1, 1, width).setFontWeight("bold");
  applyAuditFormatting();
}

function runMainWorkflow(sheet) {
  ensureShiftSections(sheet);
  removeSectionHeaderRows_(sheet);
  sortAllSections(sheet);
  applyAuditFormatting();
}

function addEmptyRowsToSection(sheet, sectionKey, rowCount) {
  ensureShiftSections(sheet);
  const bounds = findSectionBounds(sheet).filter(function(section) { return section.key === sectionKey; })[0];
  if (!bounds) throw new Error("No shift section found for key: " + sectionKey);

  const rowsToAdd = rowCount || DEBUG_EMPTY_ROWS_TO_ADD;
  const width = getAuditWidth();
  const insertRow = bounds.numEmployeeRows > 0 ? bounds.employeeEndRow + 1 : bounds.employeeStartRow;
  ensureEnoughRows_(sheet, insertRow);
  sheet.insertRowsBefore(insertRow, rowsToAdd);

  const templateRow = findTemplateEmployeeRow_(sheet, bounds, insertRow) || TABLE_HEADER_ROW;
  const targetRange = sheet.getRange(insertRow, 1, rowsToAdd, width);
  sheet.getRange(templateRow, 1, 1, width).copyTo(targetRange, { formatOnly: true });
  targetRange.clearContent().setFontWeight("normal");
  applyAuditFormatting();
}

function createDocument() {
  const sheet = getAuditSheet();
  if (!sheet) return;

  sheet.clear();
  sheet.clearConditionalFormatRules();
  sheet.setFrozenColumns(0);
  ensureEnoughColumns_(sheet, Math.max(FIRST_ATTENDANCE_COLUMN, COLS_TO_ADD));

  setupMasterSelector(sheet);
  writeGlobalHeaderRow(sheet);
  getShiftSections().forEach(function(section) {
    const titleRow = getConfiguredSectionInsertRow_(section);
    ensureEnoughRows_(sheet, titleRow);
    writeSectionSkeleton_(sheet, titleRow, section);
  });
  applyAuditFormatting();
  resetStatus(sheet);
}

function sortAllSections(sheet) {
  findSectionBounds(sheet).forEach(function(bounds) {
    sortSection(sheet, bounds);
  });
}

function sortSection(sheet, bounds) {
  if (!bounds || bounds.numEmployeeRows <= 1) return;
  const width = getAuditWidth();
  const helperColumn = width + 1;
  sheet.insertColumnAfter(width);

  try {
    const names = sheet.getRange(bounds.employeeStartRow, SECTION_NAME_COLUMN, bounds.numEmployeeRows, 1).getDisplayValues();
    const helperValues = names.map(function(row) {
      return [String(row[0]).trim() === NEW_EMPLOYEE_PLACEHOLDER ? 0 : 1];
    });
    sheet.getRange(bounds.employeeStartRow, helperColumn, bounds.numEmployeeRows, 1).setValues(helperValues);
    sheet.getRange(bounds.employeeStartRow, 1, bounds.numEmployeeRows, helperColumn).sort([
      { column: helperColumn, ascending: true },
      { column: SECTION_HIRE_STATUS_COLUMN, ascending: true },
      { column: SECTION_NAME_COLUMN, ascending: true }
    ]);
  } finally {
    sheet.deleteColumn(helperColumn);
  }
}

function addColumnsToAllSections(sheet) {
  sheet.insertColumnsAfter(sheet.getMaxColumns(), COLS_TO_ADD);
  applyAuditFormatting();
}

function applyAuditFormatting() {
  const sheet = getAuditSheet();
  if (!sheet) return;

  sheet.setFrozenColumns(0);
  ensureEnoughColumns_(sheet, FIRST_ATTENDANCE_COLUMN);
  normalizeTopRowLayout_(sheet);
  setupMasterSelector(sheet);
  writeGlobalHeaderRow(sheet);
  ensureShiftSections(sheet);
  removeSectionHeaderRows_(sheet);

  const width = getAuditWidth();
  const lastRow = Math.max(getAuditDataDepth(), START_ROW);
  const sections = findSectionBounds(sheet);

  sections.forEach(function(bounds) {
    formatSection(sheet, bounds, width);
  });

  applyColumnBLeftBorder_(sheet, lastRow, sections);
  formatStatusControl(sheet, String(sheet.getRange(MASTER_CELL).getValue() || STATUS_IDLE));
}

function formatSection(sheet, bounds, width) {
  formatGlobalHeaderRow_(sheet, width);

  sheet.getRange(bounds.titleRow, 1, 1, width)
    .breakApart()
    .setBorder(false, true, false, true, true, false, "black", SpreadsheetApp.BorderStyle.SOLID);

  sheet.getRange(bounds.titleRow, SECTION_NAME_COLUMN)
    .setValue(bounds.title)
    .setBackground(THEMES.SECTION_TITLE.BACKGROUND)
    .setFontColor(THEMES.SECTION_TITLE.FONT_COLOR)
    .setFontSize(THEMES.SECTION_TITLE.FONT_SIZE)
    .setFontWeight(THEMES.SECTION_TITLE.FONT_WEIGHT)
    .setFontFamily(GLOBAL_FONT)
    .setHorizontalAlignment("left");

  sheet.getRange(bounds.titleRow, SECTION_HIRE_STATUS_COLUMN)
    .clearContent()
    .setBackground(THEMES.HEADER.BACKGROUND)
    .setFontColor("#000000")
    .setFontSize(10)
    .setFontWeight(THEMES.HEADER.FONT_WEIGHT)
    .setFontLine(THEMES.HEADER.TEXT_DECORATION)
    .setFontFamily(THEMES.HEADER.FONT)
    .setHorizontalAlignment("center");

  if (width >= FIRST_ATTENDANCE_COLUMN) {
    sheet.getRange(bounds.titleRow, FIRST_ATTENDANCE_COLUMN, 1, width - FIRST_ATTENDANCE_COLUMN + 1)
      .setBackgrounds([getAttendanceColumnBackgrounds_(width)])
      .setFontColor("#000000")
      .setFontSize(10)
      .setFontWeight("normal")
      .setFontLine("none")
      .setFontFamily(GLOBAL_FONT);
  }

}

function setStatus(sheet, status) {
  sheet.getRange(MASTER_CELL).setValue(status);
  formatStatusControl(sheet, status);
  SpreadsheetApp.flush();
}

function resetStatus(sheet) {
  setStatus(sheet, STATUS_IDLE);
}

function formatStatusControl(sheet, status) {
  let background = THEMES.STATUS.DEFAULT_BACKGROUND;
  if (status === STATUS_WORKING) background = THEMES.STATUS.WORKING_BACKGROUND;
  if (status === STATUS_ADD_COLUMNS) background = THEMES.STATUS.ADD_COLUMNS_BACKGROUND;
  if (status === STATUS_ERROR) background = THEMES.STATUS.ERROR_BACKGROUND;

  sheet.getRange(MASTER_CELL)
    .setBackground(background)
    .setFontColor(THEMES.STATUS.DEFAULT_FONT)
    .setFontFamily(GLOBAL_FONT)
    .setBorder(true, null, true, null, null, null, "black", SpreadsheetApp.BorderStyle.SOLID);

  sheet.getRange(MASTER_CELL)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(getMasterOptions(), true).setAllowInvalid(false).build());
}

function writeSectionSkeleton_(sheet, titleRow, section) {
  sheet.getRange(titleRow, 1).setValue(section.title);
}

function writeGlobalHeaderRow(sheet) {
  const width = getAuditWidth();
  sheet.getRange(TABLE_HEADER_ROW, 1, 1, width).breakApart();
  sheet.getRange(TABLE_HEADER_ROW, SECTION_HIRE_STATUS_COLUMN).setValue("Status");
  writeDateHeaders_(sheet, TABLE_HEADER_ROW, width);
}

function formatGlobalHeaderRow_(sheet, width) {
  sheet.getRange(TABLE_HEADER_ROW, 1, 1, width).breakApart();
  sheet.getRange(TABLE_HEADER_ROW, SECTION_HIRE_STATUS_COLUMN)
    .setBackground(THEMES.HEADER.BACKGROUND)
    .setFontFamily(THEMES.HEADER.FONT)
    .setFontWeight(THEMES.HEADER.FONT_WEIGHT)
    .setFontLine(THEMES.HEADER.TEXT_DECORATION)
    .setHorizontalAlignment("center")
    .setBorder(true, true, true, true, true, null, "black", SpreadsheetApp.BorderStyle.SOLID);
  if (width >= FIRST_ATTENDANCE_COLUMN) {
    sheet.getRange(TABLE_HEADER_ROW, FIRST_ATTENDANCE_COLUMN, 1, width - FIRST_ATTENDANCE_COLUMN + 1)
      .setBackgrounds([getAttendanceColumnBackgrounds_(width)])
      .setFontFamily(THEMES.HEADER.FONT)
      .setFontWeight(THEMES.HEADER.FONT_WEIGHT)
      .setFontLine(THEMES.HEADER.TEXT_DECORATION)
      .setHorizontalAlignment("center")
      .setBorder(true, true, true, true, true, null, "black", SpreadsheetApp.BorderStyle.SOLID);
  }
  writeGlobalHeaderRow(sheet);
}

function getAttendanceColumnBackgrounds_(width) {
  const backgrounds = [];
  for (let c = FIRST_ATTENDANCE_COLUMN; c <= width; c++) {
    backgrounds.push(c % 2 === 0 ? THEMES.COLUMN_C_ALT.COLOR_1 : THEMES.COLUMN_C_ALT.COLOR_2);
  }
  return backgrounds;
}

function writeDateHeaders_(sheet, row, width) {
  if (width < FIRST_ATTENDANCE_COLUMN) return;
  const values = [[]];
  for (let c = FIRST_ATTENDANCE_COLUMN; c <= width; c++) {
    const date = new Date(HEADER_START_DATE);
    date.setDate(date.getDate() + c - FIRST_ATTENDANCE_COLUMN);
    values[0].push(date);
  }
  sheet.getRange(row, FIRST_ATTENDANCE_COLUMN, 1, values[0].length)
    .setValues(values)
    .setNumberFormat("M/d/yyyy")
    .setHorizontalAlignment("center");
}

function findTemplateEmployeeRow_(sheet, bounds, insertedRow) {
  const start = insertedRow + 1;
  const end = bounds.employeeEndRow + 1;
  for (let row = start; row <= end; row++) {
    const name = String(sheet.getRange(row, SECTION_NAME_COLUMN).getDisplayValue()).trim();
    if (name && name !== NEW_EMPLOYEE_PLACEHOLDER) return row;
  }
  return start <= end ? start : null;
}

function getConfiguredSectionInsertRow_(section) {
  const row = Number(section.titleRow);
  return row && row >= START_ROW ? Math.floor(row) : Math.max(getAuditDataDepth() + 1, START_ROW);
}

function rowHasAnyData_(sheet, row) {
  if (row < 1 || row > sheet.getMaxRows()) return false;
  return sheet.getRange(row, 1, 1, Math.max(sheet.getLastColumn(), FIRST_ATTENDANCE_COLUMN)).getDisplayValues()[0]
    .some(function(value) { return value !== "" && value !== null; });
}

function applyColumnBLeftBorder_(sheet, lastRow, sections) {
  const titleRows = (sections || [])
    .map(function(section) { return section.titleRow; })
    .filter(function(row) { return row >= TABLE_HEADER_ROW && row <= lastRow; })
    .sort(function(a, b) { return a - b; });

  let startRow = TABLE_HEADER_ROW;
  titleRows.forEach(function(titleRow) {
    applyColumnBLeftBorderRange_(sheet, startRow, titleRow - 1);
    startRow = titleRow + 1;
  });
  applyColumnBLeftBorderRange_(sheet, startRow, lastRow);
}

function applyColumnBLeftBorderRange_(sheet, startRow, endRow) {
  if (startRow > endRow) return;
  sheet.getRange(startRow, SECTION_HIRE_STATUS_COLUMN, endRow - startRow + 1, 1)
    .setBorder(null, true, null, null, null, null, "black", SpreadsheetApp.BorderStyle.SOLID);
}

function ensureEnoughRows_(sheet, row) {
  if (sheet.getMaxRows() < row) sheet.insertRowsAfter(sheet.getMaxRows(), row - sheet.getMaxRows());
}

function ensureEnoughColumns_(sheet, col) {
  if (sheet.getMaxColumns() < col) sheet.insertColumnsAfter(sheet.getMaxColumns(), col - sheet.getMaxColumns());
}

function removeSectionHeaderRows_(sheet) {
  const width = Math.max(sheet.getLastColumn(), FIRST_ATTENDANCE_COLUMN);
  const lastRow = Math.max(sheet.getLastRow(), START_ROW);
  const values = sheet.getRange(1, 1, lastRow, width).getDisplayValues();
  const byTitle = getSectionByTitle_();
  const rowsToDelete = [];

  for (let r = 0; r < values.length - 1; r++) {
    if (!byTitle[normalizeSectionTitle_(values[r][0])]) continue;
    const nextRow = values[r + 1];
    const statusHeader = String(nextRow[SECTION_HIRE_STATUS_COLUMN - 1]).trim().toLowerCase();
    if (String(nextRow[SECTION_NAME_COLUMN - 1]).trim().toLowerCase() === "name" &&
        (statusHeader === "hire status" || statusHeader === "status")) {
      rowsToDelete.push(r + 2);
    }
  }

  rowsToDelete.reverse().forEach(function(row) {
    sheet.deleteRow(row);
  });
}

function getDebugAddRowsLabel_(section) {
  return DEBUG_ADD_ROWS_LABEL_PREFIX + " " + DEBUG_EMPTY_ROWS_TO_ADD + " Rows - " + section.title;
}

function isDebugModeEnabled_() {
  return DEBUG_MODE === 1 || DEBUG_MODE === true || String(DEBUG_MODE).trim() === "1";
}

function refreshDropdownOptions() {
  const sheet = getAuditSheet();
  if (!sheet) return;
  setupMasterSelector(sheet);
}

function getSectionByTitle_() {
  const map = {};
  getShiftSections().forEach(function(section) {
    map[normalizeSectionTitle_(section.title)] = section;
  });
  return map;
}

function normalizeSectionTitle_(title) {
  return String(title || "").trim().toUpperCase();
}

function normalizeTopRowLayout_(sheet) {
  if (sheet.getMaxRows() < 2) return;

  const rowTwo = sheet.getRange(2, 1, 1, Math.max(sheet.getLastColumn(), FIRST_ATTENDANCE_COLUMN)).getDisplayValues()[0];
  const nameHeader = String(rowTwo[SECTION_NAME_COLUMN - 1]).trim().toLowerCase();
  const statusHeader = String(rowTwo[SECTION_HIRE_STATUS_COLUMN - 1]).trim().toLowerCase();
  if (nameHeader === "name" && (statusHeader === "hire status" || statusHeader === "status")) {
    sheet.deleteRow(2);
  }
}
