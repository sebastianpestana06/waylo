import type { ExpensePayment, ExpenseShare, Profile } from "./types";

export type BalanceRow = {
  userId: string;
  name: string;
  net: number;
};

/** Net from unpaid shares: positive = owed to you; negative = you owe. */
export function computeNetBalances(
  payments: (ExpensePayment & { expense_shares?: ExpenseShare[] })[],
  profiles: Record<string, Profile>,
  currencyFilter?: string,
): BalanceRow[] {
  const clean: Record<string, number> = {};
  for (const p of payments) {
    if (currencyFilter && p.currency !== currencyFilter) continue;
    for (const s of p.expense_shares ?? []) {
      if (s.paid) continue;
      if (s.user_id === p.created_by) continue;
      clean[s.user_id] = (clean[s.user_id] || 0) - Number(s.share_amount);
      clean[p.created_by] = (clean[p.created_by] || 0) + Number(s.share_amount);
    }
  }

  return Object.entries(clean)
    .map(([userId, value]) => ({
      userId,
      name: profiles[userId]?.display_name || "Traveler",
      net: Math.round(value * 100) / 100,
    }))
    .sort((a, b) => b.net - a.net);
}

export function equalSplit(total: number, userIds: string[]) {
  if (!userIds.length) return [] as { userId: string; amount: number }[];
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / userIds.length);
  let remainder = cents - base * userIds.length;
  return userIds.map((userId) => {
    const extra = remainder > 0 ? 1 : 0;
    if (remainder > 0) remainder -= 1;
    return { userId, amount: (base + extra) / 100 };
  });
}
