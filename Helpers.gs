/*
File: Helpers.gs
Author: Weston Combs
Created 5/7/26
*/

function getShiftSections() {
  return SHIFT_SECTIONS.slice();
}

<<<<<<< ours
function getAddEmployeeActionMap() {
  const actionMap = {};
  getShiftSections().forEach(function(section) {
    actionMap[section.addLabel] = section.key;
  });
  return actionMap;
}

function getMasterOptions() {
  const options = [STATUS_IDLE, STATUS_WORKING, STATUS_ADD_COLUMNS];
  getShiftSections().forEach(function(section) {
    options.push(section.addLabel);
  });
  return options;
=======
function getMasterOptions() {
  const options = [STATUS_IDLE, STATUS_NEEDS_FORMATTING, STATUS_APPLY_FORMATTING, STATUS_ADD_COLUMNS];
  getShiftSections().forEach(function(section) {
    options.push(section.addLabel);
  });
  return options;
}

function getAddEmployeeActionMap() {
  const actionMap = {};
  getShiftSections().forEach(function(section) {
    actionMap[section.addLabel] = section.key;
  });
  return actionMap;
>>>>>>> theirs
}

function getAuditSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(AUDIT_SHEET_NAME);
}

<<<<<<< ours
function getAuditDataDepth() {
  const sheet = getAuditSheet();
  if (!sheet) return 0;

  const maxRows = sheet.getMaxRows();
  const maxCols = Math.max(sheet.getLastColumn(), FIRST_ATTENDANCE_COLUMN);
  const values = sheet.getRange(1, 1, maxRows, maxCols).getDisplayValues();
  const sectionTitles = getSectionTitleMap_();
  let lastRowWithData = 0;

  for (let r = values.length - 1; r >= 0; r--) {
    const hasData = values[r].some(function(value) {
      return value !== "" && value !== null;
    });
    const hasSectionTitle = values[r].some(function(value) {
      return sectionTitles[String(value).trim().toUpperCase()] === true;
    });
    if (hasData || hasSectionTitle) {
      lastRowWithData = r + 1;
      break;
    }
  }
  return lastRowWithData;
}

function getAuditWidth() {
  const sheet = getAuditSheet();
  return sheet ? Math.max(sheet.getMaxColumns(), FIRST_ATTENDANCE_COLUMN) : 0;
=======
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
>>>>>>> theirs
}

function initializeAuditSheet() {
  const sheet = getAuditSheet();
  if (!sheet) return;
<<<<<<< ours

=======
>>>>>>> theirs
  sheet.setFrozenColumns(0);
  ensureEnoughColumns_(sheet, FIRST_ATTENDANCE_COLUMN);
  setupMasterSelector(sheet);
  ensureShiftSections(sheet);
<<<<<<< ours
  applyAuditFormatting();
  resetStatus(sheet);
}

function setupMasterSelector(sheet) {
  const masterRange = sheet.getRange(MASTER_CELL);
=======
  showReadyStatus_(sheet);
}

function setupMasterSelector(sheet) {
>>>>>>> theirs
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(getMasterOptions(), true)
    .setAllowInvalid(false)
    .build();

<<<<<<< ours
  masterRange.setDataValidation(rule)
=======
  sheet.getRange(MASTER_CELL)
    .setDataValidation(rule)
>>>>>>> theirs
    .setFontFamily(GLOBAL_FONT)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

<<<<<<< ours
  if (!masterRange.getValue()) {
    masterRange.setValue(STATUS_IDLE);
  }
  formatStatusControl(sheet, String(masterRange.getValue() || STATUS_IDLE));
}

function ensureShiftSections(sheet) {
  let bounds = findSectionBounds(sheet);
  const existingKeys = {};
  bounds.forEach(function(bound) {
    existingKeys[bound.key] = true;
  });

  getShiftSections().forEach(function(section) {
    if (existingKeys[section.key]) return;
    const insertRow = Math.max(getAuditDataDepth() + 1, START_ROW);
    ensureEnoughRows_(sheet, insertRow + SECTION_HEADER_ROWS);
    writeSectionSkeleton_(sheet, insertRow, section);
=======
  formatStatusControl(sheet, String(sheet.getRange(MASTER_CELL).getValue() || STATUS_IDLE));
}

function runLockedAction(sheet, action) {
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(0)) {
    showReadyStatus_(sheet);
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

function markNeedsFormatting(sheet) {
  PropertiesService.getDocumentProperties().setProperty(NEEDS_FORMATTING_PROPERTY, "true");
  showReadyStatus_(sheet);
}

function clearNeedsFormatting() {
  PropertiesService.getDocumentProperties().deleteProperty(NEEDS_FORMATTING_PROPERTY);
}

function needsFormatting_() {
  return PropertiesService.getDocumentProperties().getProperty(NEEDS_FORMATTING_PROPERTY) === "true";
}

function showReadyStatus_(sheet) {
  setStatus(sheet, STATUS_IDLE);
  if (needsFormatting_()) {
    Utilities.sleep(1000);
    setStatus(sheet, STATUS_NEEDS_FORMATTING);
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
>>>>>>> theirs
  });
}

function findSectionBounds(sheet) {
<<<<<<< ours
  const sections = getShiftSections();
  const sectionByTitle = {};
  sections.forEach(function(section) {
    sectionByTitle[normalizeSectionTitle_(section.title)] = section;
  });

  const lastRow = Math.max(sheet.getLastRow(), START_ROW);
  const width = Math.max(sheet.getLastColumn(), FIRST_ATTENDANCE_COLUMN);
  const values = sheet.getRange(1, 1, lastRow, width).getDisplayValues();
  const found = [];

  for (let r = 0; r < values.length; r++) {
    for (let c = 0; c < values[r].length; c++) {
      const section = sectionByTitle[normalizeSectionTitle_(values[r][c])];
      if (section) {
        found.push({
          key: section.key,
          title: section.title,
          addLabel: section.addLabel,
          titleRow: r + 1,
          titleColumn: c + 1
        });
        break;
      }
    }
  }

  found.sort(function(a, b) { return a.titleRow - b.titleRow; });

  const bottomRow = Math.max(getAuditDataDepth(), found.length ? found[found.length - 1].titleRow + SECTION_HEADER_ROWS : START_ROW);
  return found.map(function(section, index) {
    const nextTitleRow = index + 1 < found.length ? found[index + 1].titleRow : null;
    const headerRow = section.titleRow + SECTION_TITLE_ROWS;
    const employeeStartRow = headerRow + SECTION_HEADER_ROWS;
    const employeeEndRow = nextTitleRow ? nextTitleRow - 1 : Math.max(bottomRow, employeeStartRow - 1);
    section.headerRow = headerRow;
    section.employeeStartRow = employeeStartRow;
    section.employeeEndRow = Math.max(employeeEndRow, employeeStartRow - 1);
    section.numEmployeeRows = Math.max(0, section.employeeEndRow - section.employeeStartRow + 1);
    section.nextTitleRow = nextTitleRow;
=======
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
>>>>>>> theirs
    return section;
  });
}

function addEmployeeToSection(sheet, sectionKey) {
  ensureShiftSections(sheet);
<<<<<<< ours
  let bounds = findSectionBounds(sheet).filter(function(bound) {
    return bound.key === sectionKey;
  })[0];
  if (!bounds) throw new Error("No shift section found for key: " + sectionKey);

  const insertRow = bounds.employeeStartRow;
  ensureEnoughRows_(sheet, insertRow);
  sheet.insertRowsBefore(insertRow, 1);

  const width = getAuditWidth();
  const templateRow = getTemplateEmployeeRow_(sheet, bounds, insertRow);
=======
  const bounds = findSectionBounds(sheet).filter(function(section) { return section.key === sectionKey; })[0];
  if (!bounds) throw new Error("No shift section found for key: " + sectionKey);

  const insertRow = bounds.employeeStartRow;
  const width = getAuditWidth();
  sheet.insertRowsBefore(insertRow, 1);

  const templateRow = findTemplateEmployeeRow_(sheet, bounds, insertRow);
>>>>>>> theirs
  if (templateRow) {
    sheet.getRange(templateRow, 1, 1, width).copyTo(sheet.getRange(insertRow, 1, 1, width), { contentsOnly: false });
  } else {
    sheet.getRange(bounds.headerRow, 1, 1, width).copyTo(sheet.getRange(insertRow, 1, 1, width), { formatOnly: true });
  }

  sheet.getRange(insertRow, 1, 1, width).clearContent();
<<<<<<< ours
  sheet.getRange(insertRow, SECTION_NAME_COLUMN).setValue(NEW_EMPLOYEE_PLACEHOLDER).setFontWeight("bold");
  sheet.getRange(insertRow, SECTION_HIRE_STATUS_COLUMN).setFontWeight("bold");
  applyAuditFormatting();
=======
  sheet.getRange(insertRow, SECTION_NAME_COLUMN).setValue(NEW_EMPLOYEE_PLACEHOLDER);
  sheet.getRange(insertRow, 1, 1, width).setFontWeight("bold");
}

function runMainWorkflow(sheet) {
  ensureShiftSections(sheet);
  sortAllSections(sheet);
  applyAuditFormatting();
  clearNeedsFormatting();
>>>>>>> theirs
}

function sortAllSections(sheet) {
  findSectionBounds(sheet).forEach(function(bounds) {
    sortSection(sheet, bounds);
  });
}

function sortSection(sheet, bounds) {
  if (!bounds || bounds.numEmployeeRows <= 1) return;
<<<<<<< ours

=======
>>>>>>> theirs
  const width = getAuditWidth();
  const helperColumn = width + 1;
  sheet.insertColumnAfter(width);

  try {
    const names = sheet.getRange(bounds.employeeStartRow, SECTION_NAME_COLUMN, bounds.numEmployeeRows, 1).getDisplayValues();
    const helperValues = names.map(function(row) {
      return [String(row[0]).trim() === NEW_EMPLOYEE_PLACEHOLDER ? 0 : 1];
    });
    sheet.getRange(bounds.employeeStartRow, helperColumn, bounds.numEmployeeRows, 1).setValues(helperValues);
<<<<<<< ours

=======
>>>>>>> theirs
    sheet.getRange(bounds.employeeStartRow, 1, bounds.numEmployeeRows, helperColumn).sort([
      { column: helperColumn, ascending: true },
      { column: SECTION_HIRE_STATUS_COLUMN, ascending: true },
      { column: SECTION_NAME_COLUMN, ascending: true }
    ]);
  } finally {
    sheet.deleteColumn(helperColumn);
  }
}

<<<<<<< ours
function formatSection(sheet, bounds) {
  if (!bounds) return;
  const width = getAuditWidth();
  const titleRange = sheet.getRange(bounds.titleRow, 1, 1, width);
  titleRange.breakApart()
=======
function addColumnsToAllSections(sheet) {
  sheet.insertColumnsAfter(sheet.getMaxColumns(), COLS_TO_ADD);
  markNeedsFormatting(sheet);
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
>>>>>>> theirs
    .merge()
    .setValue(bounds.title)
    .setBackground(THEMES.SECTION_TITLE.BACKGROUND)
    .setFontColor(THEMES.SECTION_TITLE.FONT_COLOR)
    .setFontSize(THEMES.SECTION_TITLE.FONT_SIZE)
    .setFontWeight(THEMES.SECTION_TITLE.FONT_WEIGHT)
    .setFontFamily(GLOBAL_FONT)
    .setHorizontalAlignment("left")
<<<<<<< ours
    .setVerticalAlignment("middle")
    .setBorder(true, true, true, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID);

  const headerRange = sheet.getRange(bounds.headerRow, 1, 1, width);
  headerRange.breakApart()
=======
    .setBorder(true, true, true, true, null, null, "black", SpreadsheetApp.BorderStyle.SOLID);

  sheet.getRange(bounds.headerRow, 1, 1, width)
    .breakApart()
>>>>>>> theirs
    .setBackground(THEMES.HEADER.BACKGROUND)
    .setFontFamily(THEMES.HEADER.FONT)
    .setFontWeight(THEMES.HEADER.FONT_WEIGHT)
    .setFontLine(THEMES.HEADER.TEXT_DECORATION)
<<<<<<< ours
    .setFontColor("#000000")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
=======
    .setHorizontalAlignment("center")
>>>>>>> theirs
    .setBorder(true, true, true, true, true, null, "black", SpreadsheetApp.BorderStyle.SOLID);

  sheet.getRange(bounds.headerRow, SECTION_NAME_COLUMN).setValue("Name");
  sheet.getRange(bounds.headerRow, SECTION_HIRE_STATUS_COLUMN).setValue("Hire Status");
  writeDateHeaders_(sheet, bounds.headerRow, width);

  if (bounds.numEmployeeRows > 0) {
    formatEmployeeRows_(sheet, bounds, width);
  }
}

<<<<<<< ours
function applyAuditFormatting() {
  const sheet = getAuditSheet();
  if (!sheet) return;

  sheet.setFrozenColumns(0);
  ensureEnoughColumns_(sheet, FIRST_ATTENDANCE_COLUMN);
  setupMasterSelector(sheet);

  const totalCols = getAuditWidth();
  const maxRows = sheet.getMaxRows();
  if (maxRows >= START_ROW) {
    sheet.getRange(START_ROW, 1, maxRows - START_ROW + 1, totalCols)
      .setBackground(null)
      .setBorder(false, false, false, false, false, false);
  }

  ensureShiftSections(sheet);
  findSectionBounds(sheet).forEach(function(bounds) {
    formatSection(sheet, bounds);
  });

  clearBCDivider_(sheet);
  formatStatusControl(sheet, String(sheet.getRange(MASTER_CELL).getValue() || STATUS_IDLE));
=======
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
>>>>>>> theirs
}

function setStatus(sheet, status) {
  sheet.getRange(MASTER_CELL).setValue(status);
  formatStatusControl(sheet, status);
  SpreadsheetApp.flush();
}

function resetStatus(sheet) {
<<<<<<< ours
  setStatus(sheet, STATUS_IDLE);
}

function formatStatusControl(sheet, status) {
  const totalCols = Math.max(sheet.getMaxColumns(), FIRST_ATTENDANCE_COLUMN);
  const controlRange = sheet.getRange(HEADER_ROW, 1, 1, totalCols);
  let background = THEMES.STATUS.DEFAULT_BACKGROUND;
=======
  showReadyStatus_(sheet);
}

function formatStatusControl(sheet, status) {
  const width = Math.max(sheet.getMaxColumns(), FIRST_ATTENDANCE_COLUMN);
  let background = THEMES.STATUS.DEFAULT_BACKGROUND;
  if (status === STATUS_NEEDS_FORMATTING) background = THEMES.STATUS.NEEDS_FORMATTING_BACKGROUND;
>>>>>>> theirs
  if (status === STATUS_WORKING) background = THEMES.STATUS.WORKING_BACKGROUND;
  if (status === STATUS_ADD_COLUMNS) background = THEMES.STATUS.ADD_COLUMNS_BACKGROUND;
  if (status === STATUS_ERROR) background = THEMES.STATUS.ERROR_BACKGROUND;

<<<<<<< ours
  controlRange.setBackground(background)
    .setFontColor(THEMES.STATUS.DEFAULT_FONT)
    .setFontFamily(GLOBAL_FONT)
    .setBorder(true, null, true, null, null, null, "black", SpreadsheetApp.BorderStyle.SOLID);
=======
  sheet.getRange(HEADER_ROW, 1, 1, width)
    .setBackground(background)
    .setFontColor(THEMES.STATUS.DEFAULT_FONT)
    .setFontFamily(GLOBAL_FONT)
    .setBorder(true, null, true, null, null, null, "black", SpreadsheetApp.BorderStyle.SOLID);

>>>>>>> theirs
  sheet.getRange(MASTER_CELL)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(getMasterOptions(), true).setAllowInvalid(false).build());
}

<<<<<<< ours
function addColumnsToAllSections(sheet) {
  const currentWidth = sheet.getMaxColumns();
  sheet.insertColumnsAfter(currentWidth, COLS_TO_ADD);
  applyAuditFormatting();
}

function runMainWorkflow(sheet) {
  ensureShiftSections(sheet);
  sortAllSections(sheet);
  SpreadsheetApp.flush();
  applyAuditFormatting();
}

function formatEmployeeRows_(sheet, bounds, width) {
  const range = sheet.getRange(bounds.employeeStartRow, 1, bounds.numEmployeeRows, width);
  const values = range.getDisplayValues();
  const backgrounds = [];
  const fontWeights = [];

  for (let i = 0; i < values.length; i++) {
    const rowBackgrounds = [];
    const rowFontWeights = [];
    let startColIdx = -1;
    let termColIdx = 999;
    const isPlaceholder = String(values[i][SECTION_NAME_COLUMN - 1]).trim() === NEW_EMPLOYEE_PLACEHOLDER;

    for (let j = 0; j < width; j++) {
      const val = String(values[i][j] || "");
      if (THEMES.BOUNDARIES.START.test(val)) startColIdx = j;
      if (THEMES.BOUNDARIES.TERMINATED.test(val)) termColIdx = j;
    }

    for (let j = 0; j < width; j++) {
      const cellValue = String(values[i][j] || "").trim();
      const colIndex = j + 1;
      const isEmpty = cellValue === "";
      rowFontWeights.push(isPlaceholder ? "bold" : "normal");

      if (colIndex === SECTION_NAME_COLUMN) {
        rowBackgrounds.push(THEMES.COLUMN_A.BACKGROUND);
      } else if (colIndex === SECTION_HIRE_STATUS_COLUMN) {
        rowBackgrounds.push(THEMES.COLUMN_B.BACKGROUND);
      } else if (THEMES.BOUNDARIES.START.test(cellValue) || THEMES.BOUNDARIES.TERMINATED.test(cellValue)) {
        rowBackgrounds.push(THEMES.BOUNDARIES.HIGHLIGHT_BG);
      } else if (isEmpty && (j < startColIdx || j > termColIdx)) {
        rowBackgrounds.push(THEMES.BLACK_OUT);
      } else {
        rowBackgrounds.push(colIndex % 2 === 0 ? THEMES.COLUMN_C_ALT.COLOR_1 : THEMES.COLUMN_C_ALT.COLOR_2);
      }
    }
    backgrounds.push(rowBackgrounds);
    fontWeights.push(rowFontWeights);
  }

  range.setBackgrounds(backgrounds)
    .setFontWeights(fontWeights)
    .setFontFamily(GLOBAL_FONT)
    .setBorder(null, null, null, true, true, null, "black", SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange(bounds.employeeEndRow, 1, 1, width)
    .setBorder(null, null, true, null, null, null, "black", SpreadsheetApp.BorderStyle.SOLID);
=======
function writeSectionSkeleton_(sheet, titleRow, section) {
  const width = getAuditWidth();
  sheet.getRange(titleRow, 1).setValue(section.title);
  sheet.getRange(titleRow + SECTION_TITLE_ROWS, SECTION_NAME_COLUMN).setValue("Name");
  sheet.getRange(titleRow + SECTION_TITLE_ROWS, SECTION_HIRE_STATUS_COLUMN).setValue("Hire Status");
  writeDateHeaders_(sheet, titleRow + SECTION_TITLE_ROWS, width);
>>>>>>> theirs
}

function writeDateHeaders_(sheet, row, width) {
  if (width < FIRST_ATTENDANCE_COLUMN) return;
<<<<<<< ours
  const dateRange = sheet.getRange(row, FIRST_ATTENDANCE_COLUMN, 1, width - FIRST_ATTENDANCE_COLUMN + 1);
  const headerValues = [[]];
  for (let c = 0; c < width - FIRST_ATTENDANCE_COLUMN + 1; c++) {
    const nextDate = new Date(HEADER_START_DATE);
    nextDate.setDate(nextDate.getDate() + c);
    headerValues[0].push(nextDate);
  }
  dateRange.setValues(headerValues)
=======
  const values = [[]];
  for (let c = FIRST_ATTENDANCE_COLUMN; c <= width; c++) {
    const date = new Date(HEADER_START_DATE);
    date.setDate(date.getDate() + c - FIRST_ATTENDANCE_COLUMN);
    values[0].push(date);
  }
  sheet.getRange(row, FIRST_ATTENDANCE_COLUMN, 1, values[0].length)
    .setValues(values)
>>>>>>> theirs
    .setNumberFormat("M/d/yyyy")
    .setHorizontalAlignment("center");
}

<<<<<<< ours
function writeSectionSkeleton_(sheet, titleRow, section) {
  const width = getAuditWidth();
  sheet.getRange(titleRow, 1).setValue(section.title);
  sheet.getRange(titleRow + SECTION_TITLE_ROWS, SECTION_NAME_COLUMN).setValue("Name");
  sheet.getRange(titleRow + SECTION_TITLE_ROWS, SECTION_HIRE_STATUS_COLUMN).setValue("Hire Status");
  writeDateHeaders_(sheet, titleRow + SECTION_TITLE_ROWS, width);
}

function getTemplateEmployeeRow_(sheet, bounds, insertedRow) {
  const shiftedStart = insertedRow + 1;
  const shiftedEnd = bounds.employeeEndRow + 1;
  for (let row = shiftedStart; row <= shiftedEnd; row++) {
    const value = String(sheet.getRange(row, SECTION_NAME_COLUMN).getDisplayValue()).trim();
    if (value && value !== NEW_EMPLOYEE_PLACEHOLDER) return row;
  }
  for (let row = shiftedStart; row <= shiftedEnd; row++) {
    if (row !== insertedRow) return row;
  }
  return null;
=======
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
>>>>>>> theirs
}

function clearBCDivider_(sheet) {
  sheet.setFrozenColumns(0);
  const rows = sheet.getMaxRows();
<<<<<<< ours
  if (rows > 0) {
    sheet.getRange(1, 2, rows, 1).setBorder(null, null, null, false, null, null);
    sheet.getRange(1, 3, rows, 1).setBorder(null, false, null, null, null, null);
  }
}

function ensureEnoughRows_(sheet, row) {
  if (sheet.getMaxRows() < row) {
    sheet.insertRowsAfter(sheet.getMaxRows(), row - sheet.getMaxRows());
  }
}

function ensureEnoughColumns_(sheet, col) {
  if (sheet.getMaxColumns() < col) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), col - sheet.getMaxColumns());
  }
}

function getSectionTitleMap_() {
  const map = {};
  getShiftSections().forEach(function(section) {
    map[normalizeSectionTitle_(section.title)] = true;
=======
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
>>>>>>> theirs
  });
  return map;
}

function normalizeSectionTitle_(title) {
  return String(title || "").trim().toUpperCase();
}
