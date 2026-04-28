export const ROLES = ["ADMIN", "STAFF"] as const;
export type Role = typeof ROLES[number];
