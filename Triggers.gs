/*
File: Triggers.gs
Author: Weston Combs
Created 5/7/26
*/

function onOpen() {
  initializeAuditSheet();
}

function onEdit(e) {
  if (!e || !e.range) return;

  const range = e.range;
  const sheet = range.getSheet();
  if (sheet.getName() !== AUDIT_SHEET_NAME) return;

  const isMasterCellEdit = range.getA1Notation() === MASTER_CELL;
  const newValue = e.value;
  const addEmployeeActions = getAddEmployeeActionMap();

  if (!isMasterCellEdit) {
    if (range.getColumn() <= getAuditWidth()) markNeedsFormatting(sheet);
    return;
  }

  if (newValue === STATUS_APPLY_FORMATTING || newValue === STATUS_WORKING) {
    if (runLockedAction(sheet, function() {
      runMainWorkflow(sheet);
    })) showReadyStatus_(sheet);
    return;
  }

  if (newValue === STATUS_ADD_COLUMNS) {
    if (runLockedAction(sheet, function() {
      sheet.insertColumnsAfter(sheet.getMaxColumns(), COLS_TO_ADD);
      PropertiesService.getDocumentProperties().setProperty(NEEDS_FORMATTING_PROPERTY, "true");
    })) showReadyStatus_(sheet);
    return;
  }

  if (addEmployeeActions[newValue]) {
    if (runLockedAction(sheet, function() {
      addEmployeeToSection(sheet, addEmployeeActions[newValue]);
      PropertiesService.getDocumentProperties().setProperty(NEEDS_FORMATTING_PROPERTY, "true");
    })) showReadyStatus_(sheet);
    return;
  }

  setupMasterSelector(sheet);
}
