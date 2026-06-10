/*
File: Constants.gs
Author: Weston Combs
Created 5/7/26
*/

const AUDIT_SHEET_NAME = "Copy of ACO Post Arrival Time Audit";
//const AUDIT_SHEET_NAME = "ACO Post Arrival Time Audit";
const START_ROW = 3;
const HEADER_ROW = 1;
const TABLE_HEADER_ROW = 2;
const MASTER_CELL = "A1";

// Dropdown Statuses
const STATUS_IDLE = "Idle";
const STATUS_WORKING = "Formatting Document";
const STATUS_ADD_COLUMNS = "Add Columns";
const STATUS_CREATE_DOCUMENT = "CREATE DOCUMENT";
const STATUS_ERROR = "ERROR";

// Functionality Settings
const COLS_TO_ADD = 21;
const HEADER_START_DATE = new Date("04/11/2026");
const TEMPLATE_SHEET_NAME = "Empty (for copy/paste)";
const DEBUG_EMPTY_ROWS_TO_ADD = 50;
const DEBUG_ADD_ROWS_LABEL_PREFIX = "Bulk Add";

// Debug Settings
// Keep this 0 for normal users. Set to 1, true, or "1" to expose debug dropdown actions.
const DEBUG_MODE = 0;

// Shift Section Settings
// Set titleRow to choose where a missing section title should be created.
// Once a section exists, the script finds it by title text so users can move rows safely.
const SHIFT_SECTIONS = [
  { key: "first", title: "FIRST SHIFT", addLabel: "Add First Shift Employee", titleRow: 3 },
  { key: "second", title: "SECOND SHIFT", addLabel: "Add Second Shift Employee", titleRow: 20 },
  { key: "third", title: "THIRD SHIFT", addLabel: "Add Third Shift Employee", titleRow: 37 }
];
const SECTION_TITLE_ROWS = 1;
const SECTION_HEADER_ROWS = 0;
const SECTION_NAME_COLUMN = 1;
const SECTION_HIRE_STATUS_COLUMN = 2;
const FIRST_ATTENDANCE_COLUMN = 3;
const NEW_EMPLOYEE_PLACEHOLDER = "Add New Row";

// New Shift Notes Setting
const SHIFT_NOTES_LABEL = "SHIFT NOTES:";
