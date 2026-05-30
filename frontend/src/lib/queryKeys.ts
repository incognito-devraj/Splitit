/**
 * Centralised React Query key factory.
 * ALL screens must use these keys so invalidation propagates everywhere.
 *
 * Rule: invalidating ["expenses"] invalidates ALL expense queries
 * because React Query matches by prefix.
 */
export const QK = {
  group: (groupId?: string | null) => ["group", groupId ?? "none"] as const,
  groupsMine: ["groups", "mine"] as const,
  members: (groupId?: string | null) => ["members", groupId ?? "none"] as const,
  expenses: (groupId?: string | null) => ["expenses", groupId ?? "none"] as const,
  balances: (groupId?: string | null) => ["balances", groupId ?? "none"] as const,
  settlements: (groupId?: string | null) => ["settlements", groupId ?? "none"] as const,
  summary: (groupId?: string | null) => ["summary", groupId ?? "none"] as const,
  summaryCategory: (groupId?: string | null) => ["summary-category", groupId ?? "none"] as const,
} as const;
