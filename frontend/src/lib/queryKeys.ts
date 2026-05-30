/**
 * Centralised React Query key factory.
 * ALL screens must use these keys so invalidation propagates everywhere.
 *
 * Rule: invalidating ["expenses"] invalidates ALL expense queries
 * because React Query matches by prefix.
 */
export const QK = {
  group:          ["group"]           as const,
  members:        ["members"]         as const,
  expenses:       ["expenses"]        as const,   // ← single key for ALL expense queries
  balances:       ["balances"]        as const,
  settlements:    ["settlements"]     as const,
  summary:        ["summary"]         as const,
  summaryCategory:["summary-category"]as const,
} as const;
