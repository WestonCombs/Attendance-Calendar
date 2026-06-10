/*
File: Helpers.gs
Author: Weston Combs
Created 5/7/26
*/

function getShiftSections() {
  return SHIFT_SECTIONS.slice();
}

function getMasterOptions() {
  const options = [STATUS_IDLE, STATUS_WORKING, STATUS_ADD_COLUMNS];
  getShiftSections().forEach(function(section) {
    options.push(section.addLabel);
  });
  if (DEBUG_MODE === 1) {
    options.push(STATUS_CREATE_DOCUMENT);
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
  setupMasterSelector(sheet);
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
    ensureEnoughRows_(sheet, row + SECTION_HEADER_ROWS);
    if (rowHasAnyData_(sheet, row) || rowHasAnyData_(sheet, row + 1)) {
      sheet.insertRowsBefore(row, SECTION_TITLE_ROWS + SECTION_HEADER_ROWS);
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
    section.headerRow = section.titleRow + SECTION_TITLE_ROWS;
    section.employeeStartRow = section.headerRow + SECTION_HEADER_ROWS;
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
    sheet.getRange(bounds.headerRow, 1, 1, width).copyTo(sheet.getRange(insertRow, 1, 1, width), { formatOnly: true });
  }

  sheet.getRange(insertRow, 1, 1, width).clearContent();
  sheet.getRange(insertRow, SECTION_NAME_COLUMN).setValue(NEW_EMPLOYEE_PLACEHOLDER);
  sheet.getRange(insertRow, 1, 1, width).setFontWeight("bold");
}

function runMainWorkflow(sheet) {
  ensureShiftSections(sheet);
  sortAllSections(sheet);
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
  getShiftSections().forEach(function(section) {
    const titleRow = getConfiguredSectionInsertRow_(section);
    ensureEnoughRows_(sheet, titleRow + SECTION_HEADER_ROWS);
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
  setupMasterSelector(sheet);
  ensureShiftSections(sheet);

  const width = getAuditWidth();
  const lastRow = Math.max(getAuditDataDepth(), START_ROW);
  sheet.getRange(START_ROW, 1, lastRow - START_ROW + 1, width)
    .setBackground(null)
    .setFontWeight("normal")
    .setFontColor("#000000")
    .setFontLine("none")
    .setBorder(false, false, false, false, false, false);

  findSectionBounds(sheet).forEach(function(bounds) {
    formatSection(sheet, bounds, width);
  });

  clearBCDivider_(sheet);
  formatStatusControl(sheet, String(sheet.getRange(MASTER_CELL).getValue() || STATUS_IDLE));
}

function formatSection(sheet, bounds, width) {
  sheet.getRange(bounds.titleRow, 1, 1, width)
    .breakApart()
    .merge()
    .setValue(bounds.title)
    .setBackground(THEMES.SECTION_TITLE.BACKGROUND)
    .setFontColor(THEMES.SECTION_TITLE.FONT_COLOR)
    .setFontSize(THEMES.SECTION_TITLE.FONT_SIZE)
    .setFontWeight(THEMES.SECTION_TITLE.FONT_WEIGHT)
    .setFontFamily(GLOBAL_FONT)
    .setHorizontalAlignment("left")
    .setBorder(true, true, true, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID);

  sheet.getRange(bounds.headerRow, 1, 1, width)
    .breakApart()
    .setBackground(THEMES.HEADER.BACKGROUND)
    .setFontFamily(THEMES.HEADER.FONT)
    .setFontWeight(THEMES.HEADER.FONT_WEIGHT)
    .setFontLine(THEMES.HEADER.TEXT_DECORATION)
    .setHorizontalAlignment("center")
    .setBorder(true, true, true, true, true, null, "black", SpreadsheetApp.BorderStyle.SOLID);

  sheet.getRange(bounds.headerRow, SECTION_NAME_COLUMN).setValue("Name");
  sheet.getRange(bounds.headerRow, SECTION_HIRE_STATUS_COLUMN).setValue("Hire Status");
  writeDateHeaders_(sheet, bounds.headerRow, width);

  if (bounds.numEmployeeRows > 0) {
    formatEmployeeRows_(sheet, bounds, width);
  }
}

function formatEmployeeRows_(sheet, bounds, width) {
  const range = sheet.getRange(bounds.employeeStartRow, 1, bounds.numEmployeeRows, width);
  const values = range.getDisplayValues();
  const backgrounds = [];
  const weights = [];

  values.forEach(function(row) {
    const isPlaceholder = String(row[SECTION_NAME_COLUMN - 1]).trim() === NEW_EMPLOYEE_PLACEHOLDER;
    const rowBackgrounds = [];
    const rowWeights = [];
    for (let c = 1; c <= width; c++) {
      rowWeights.push(isPlaceholder ? "bold" : "normal");
      if (c === SECTION_NAME_COLUMN) rowBackgrounds.push(THEMES.COLUMN_A.BACKGROUND);
      else if (c === SECTION_HIRE_STATUS_COLUMN) rowBackgrounds.push(THEMES.COLUMN_B.BACKGROUND);
      else rowBackgrounds.push(c % 2 === 0 ? THEMES.COLUMN_C_ALT.COLOR_1 : THEMES.COLUMN_C_ALT.COLOR_2);
    }
    backgrounds.push(rowBackgrounds);
    weights.push(rowWeights);
  });

  range.setBackgrounds(backgrounds)
    .setFontWeights(weights)
    .setFontFamily(GLOBAL_FONT)
    .setBorder(null, null, null, true, true, null, "black", SpreadsheetApp.BorderStyle.SOLID);
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
  const width = Math.max(sheet.getMaxColumns(), FIRST_ATTENDANCE_COLUMN);
  let background = THEMES.STATUS.DEFAULT_BACKGROUND;
  if (status === STATUS_WORKING) background = THEMES.STATUS.WORKING_BACKGROUND;
  if (status === STATUS_ADD_COLUMNS) background = THEMES.STATUS.ADD_COLUMNS_BACKGROUND;
  if (status === STATUS_ERROR) background = THEMES.STATUS.ERROR_BACKGROUND;

  sheet.getRange(HEADER_ROW, 1, 1, width)
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
  const width = getAuditWidth();
  sheet.getRange(titleRow, 1).setValue(section.title);
  sheet.getRange(titleRow + SECTION_TITLE_ROWS, SECTION_NAME_COLUMN).setValue("Name");
  sheet.getRange(titleRow + SECTION_TITLE_ROWS, SECTION_HIRE_STATUS_COLUMN).setValue("Hire Status");
  writeDateHeaders_(sheet, titleRow + SECTION_TITLE_ROWS, width);
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

function clearBCDivider_(sheet) {
  sheet.setFrozenColumns(0);
  const rows = sheet.getMaxRows();
  sheet.getRange(1, 2, rows, 1).setBorder(null, null, null, false, null, null);
  sheet.getRange(1, 3, rows, 1).setBorder(null, false, null, null, null, null);
}

function ensureEnoughRows_(sheet, row) {
  if (sheet.getMaxRows() < row) sheet.insertRowsAfter(sheet.getMaxRows(), row - sheet.getMaxRows());
}

function ensureEnoughColumns_(sheet, col) {
  if (sheet.getMaxColumns() < col) sheet.insertColumnsAfter(sheet.getMaxColumns(), col - sheet.getMaxColumns());
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
