/*
File: Themes.gs
Author: Weston Combs
Created 5/7/26
*/

const GLOBAL_FONT = "Arial";

const THEMES = {
  STATUS: {
    DEFAULT_BACKGROUND: "#000000",
    DEFAULT_FONT: "#ffffff",
    WORKING_BACKGROUND: "#f1c232",
    ADD_COLUMNS_BACKGROUND: "#6fa8dc",
    ERROR_BACKGROUND: "#cc0000"
  },
  SECTION_TITLE: {
    BACKGROUND: "#000000",
    FONT_COLOR: "#ffffff",
    FONT_SIZE: 18,
    FONT_WEIGHT: "bold"
  },
  HEADER: {
    BACKGROUND: "#d9d9d9", // Grey
    FONT_WEIGHT: "bold",
    TEXT_DECORATION: "underline",
    FONT: GLOBAL_FONT
  },
  COLUMN_A: {
    BACKGROUND: "#fce5cd",
    FONT: GLOBAL_FONT
  },
  COLUMN_B: {
    BACKGROUND: "#cccccc",
    FONT: GLOBAL_FONT
  },
  COLUMN_C_ALT: {
    COLOR_1: "#c9daf8",
    COLOR_2: "#d9d2e9",
    FONT: GLOBAL_FONT
  },
  BOUNDARIES: {
    START: /starting date|start date/i,
    TERMINATED: /terminated/i,
    HIGHLIGHT_BG: "#ff9900" // Orange for the actual keyword cell
  },
  BLACK_OUT: "#ffffff" // White for pre-start/post-termination
};
