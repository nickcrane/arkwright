export function formatUSD(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function calcMarginPercent(revenue: number, cost: number): number {
  if (revenue === 0) return 0;
  return ((revenue - cost) / revenue) * 100;
}

export function calcMarkup(cost: number, marginPercent: number): number {
  return cost / (1 - marginPercent / 100);
}
