export const APP_NAME = "Xcode Test Runner";

export const DATE_FILTERS = [
  { label: "Today", value: "today" },
  { label: "7 Days", value: "7d" },
  { label: "30 Days", value: "30d" },
] as const;

export const RUN_STATUS = {
  PASSED: "passed",
  FAILED: "failed",
  RUNNING: "running",
  CANCELLED: "cancelled",
} as const;
