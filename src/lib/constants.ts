export const CONDITION_LABELS: Record<string, string> = {
  NEW: "New",
  LIKE_NEW: "Like New",
  GOOD: "Good",
  FAIR: "Fair",
  POOR: "Poor",
  NOT_APPLICABLE: "Not applicable",
};

export const CONDITION_VALUES = ["NEW", "LIKE_NEW", "GOOD", "FAIR", "POOR"] as const;

export const REPORT_REASON_LABELS: Record<string, string> = {
  SCAM: "Scam",
  FRAUD: "Fraud",
  SPAM: "Spam",
  PROHIBITED_ITEM: "Prohibited item",
  ILLEGAL_ACTIVITY: "Illegal activity",
  HARASSMENT: "Harassment",
  MISLEADING_INFORMATION: "Misleading information",
  DUPLICATE_LISTING: "Duplicate listing",
  WRONG_CATEGORY: "Wrong category",
  OTHER: "Other",
};

export const LISTING_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_PAYMENT: "Pending payment",
  ACTIVE: "Active",
  PAUSED: "Paused",
  EXPIRED: "Expired",
  REMOVED: "Removed",
  REJECTED: "Rejected",
  FLAGGED: "Flagged",
};

export const RADIUS_OPTIONS = [5, 10, 25, 50, 100] as const;
