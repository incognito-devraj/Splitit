/**
 * Format a rupee amount.
 * - Whole numbers  → ₹150
 * - Decimals       → ₹150.50  (always 2 decimal places when non-zero)
 * - Large numbers  → ₹1,50,000  (en-IN locale grouping)
 */
export function formatINR(amount: number, opts?: { forceDecimals?: boolean }): string {
  const hasDecimals = amount % 1 !== 0;
  const fractionDigits = hasDecimals || opts?.forceDecimals ? 2 : 0;
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
}

/**
 * Format a per-head split amount.
 * Shows "/head" suffix and preserves decimals.
 */
export function formatSplit(amount: number): string {
  return `${formatINR(amount)}/head`;
}
