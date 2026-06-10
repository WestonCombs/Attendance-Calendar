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
  if (!isMasterCellEdit) return;

  const newValue = e.value;
  const addEmployeeActions = getAddEmployeeActionMap();
  const debugAddRowsActions = getDebugAddRowsActionMap();

  if (newValue === STATUS_WORKING) {
    if (runLockedAction(sheet, function() {
      runMainWorkflow(sheet);
    })) resetStatus(sheet);
    return;
  }

  if (newValue === STATUS_ADD_COLUMNS) {
    if (runLockedAction(sheet, function() {
      addColumnsToAllSections(sheet);
    })) resetStatus(sheet);
    return;
  }

  if (addEmployeeActions[newValue]) {
    if (runLockedAction(sheet, function() {
      addEmployeeToSection(sheet, addEmployeeActions[newValue]);
    })) resetStatus(sheet);
    return;
  }

  if (DEBUG_MODE === 1 && debugAddRowsActions[newValue]) {
    if (runLockedAction(sheet, function() {
      addEmptyRowsToSection(sheet, debugAddRowsActions[newValue], DEBUG_EMPTY_ROWS_TO_ADD);
    })) resetStatus(sheet);
    return;
  }

  if (DEBUG_MODE === 1 && newValue === STATUS_CREATE_DOCUMENT) {
    if (runLockedAction(sheet, function() {
      createDocument();
    })) resetStatus(sheet);
    return;
  }

  setupMasterSelector(sheet);
}
