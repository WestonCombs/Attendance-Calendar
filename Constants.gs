/*
File: Constants.gs
Author: Weston Combs
Created 5/7/26
*/

const AUDIT_SHEET_NAME = "Copy of ACO Post Arrival Time Audit";
//const AUDIT_SHEET_NAME = "ACO Post Arrival Time Audit";
const START_ROW = 3;
const HEADER_ROW = 1;
const MASTER_CELL = "A1";

// Dropdown Statuses
const STATUS_IDLE = "Idle";
<<<<<<< ours
=======
const STATUS_NEEDS_FORMATTING = "Needs Formatting";
const STATUS_APPLY_FORMATTING = "Apply Formatting";
>>>>>>> theirs
const STATUS_WORKING = "Formatting Document";
const STATUS_ADD_COLUMNS = "Add Columns";
const STATUS_ERROR = "ERROR";

// Functionality Settings
const COLS_TO_ADD = 21;
const HEADER_START_DATE = new Date("04/11/2026");
const TEMPLATE_SHEET_NAME = "Empty (for copy/paste)";
<<<<<<< ours

// Shift Section Settings
const SHIFT_SECTIONS = [
  { key: "first", title: "FIRST SHIFT", addLabel: "Add First Shift Employee" },
  { key: "second", title: "SECOND SHIFT", addLabel: "Add Second Shift Employee" },
  { key: "third", title: "THIRD SHIFT", addLabel: "Add Third Shift Employee" }
=======
const NEEDS_FORMATTING_PROPERTY = "NEEDS_FORMATTING";

// Shift Section Settings
// Set titleRow to choose where a missing section title should be created.
// Once a section exists, the script finds it by title text so users can move rows safely.
const SHIFT_SECTIONS = [
  { key: "first", title: "FIRST SHIFT", addLabel: "Add First Shift Employee", titleRow: 3 },
  { key: "second", title: "SECOND SHIFT", addLabel: "Add Second Shift Employee", titleRow: 20 },
  { key: "third", title: "THIRD SHIFT", addLabel: "Add Third Shift Employee", titleRow: 37 }
>>>>>>> theirs
];
const SECTION_TITLE_ROWS = 1;
const SECTION_HEADER_ROWS = 1;
const SECTION_NAME_COLUMN = 1;
const SECTION_HIRE_STATUS_COLUMN = 2;
const FIRST_ATTENDANCE_COLUMN = 3;
const NEW_EMPLOYEE_PLACEHOLDER = "Add New Row";

// New Shift Notes Setting
const SHIFT_NOTES_LABEL = "SHIFT NOTES:";
