import type { ContactFilter, ImportSource } from "./types";

export const statusLabels: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  replied: "Replied",
  qualified: "Qualified",
  customer: "Customer",
};

export const prospectFilters: Array<{ key: ContactFilter; label: string }> = [
  { key: "all", label: "All Prospects" },
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "replied", label: "Replied" },
  { key: "customer", label: "Customers" },
];

export const importSourceLabels: Record<ImportSource, string> = {
  contacts: "Google Contacts",
  gmail: "Gmail",
  calendar: "Google Calendar",
};

export const connectorIdMap: Record<ImportSource, string> = {
  contacts: "google-contacts",
  gmail: "gmail",
  calendar: "google-calendar",
};
