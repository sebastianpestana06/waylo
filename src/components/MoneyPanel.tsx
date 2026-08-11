"use client";

import { createExpense, markSharePaid } from "@/lib/actions";
import { formatMoney } from "@/lib/alerts";
import { computeNetBalances } from "@/lib/settle";
import type { ExpensePayment, ExpenseShare, Profile, TripMember } from "@/lib/types";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function MoneyPanel({
  tripId,
  payments,
  members,
  profiles,
  userId,
  canEdit,
  focusId,
}: {
  tripId: string;
  payments: ExpensePayment[];
  members: TripMember[];
  profiles: Record<string, Profile>;
  userId: string;
  canEdit: boolean;
  focusId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState(members.map((m) => m.user_id));
  const [paidOverrides, setPaidOverrides] = useState<Record<string, boolean>>(
    {},
  );

  const balances = useMemo(
    () => computeNetBalances(payments, profiles),
    [payments, profiles],
  );

  const canMarkPaid = (createdBy: string) =>
    createdBy === userId ||
    members.find((m) => m.user_id === userId)?.role === "owner";

  function isPaid(share: ExpenseShare) {
    if (share.id in paidOverrides) return paidOverrides[share.id];
    return Boolean(share.paid);
  }

  function togglePaid(share: ExpenseShare, payment: ExpensePayment, next: boolean) {
    if (!canMarkPaid(payment.created_by)) return;
    // Payer's own share is always settled — don't toggle
    if (share.user_id === payment.created_by) return;

    setPaidOverrides((prev) => ({ ...prev, [share.id]: next }));
    startTransition(async () => {
      try {
        await markSharePaid(tripId, share.id, next);
        router.refresh();
      } catch {
        setPaidOverrides((prev) => ({ ...prev, [share.id]: !next }));
      }
    });
  }

  return (
    <div className="space-y-4 animate-fade">
      <div className="panel">
        <h3 className="font-display text-xl">Settle-up</h3>
        <ul className="mt-3 space-y-2">
          {balances.length === 0 && (
            <li className="text-sm text-ink-soft">No outstanding balances.</li>
          )}
          {balances.map((b) => (
            <li key={b.userId} className="flex justify-between text-sm">
              <span>{b.name}</span>
              <span className={b.net >= 0 ? "text-leaf" : "text-coral"}>
                {b.net >= 0 ? "+" : ""}
                {formatMoney(b.net, payments[0]?.currency || "EUR")}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {canEdit && (
        <form
          action={async (fd) => {
            fd.set("member_ids", selected.join(","));
            await createExpense(tripId, fd);
            router.refresh();
          }}
          className="panel space-y-3"
        >
          <h3 className="font-display text-xl">Add payment</h3>
          <input
            name="description"
            className="field"
            placeholder="Accommodation in Kyoto"
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              className="field"
              placeholder="Amount"
              required
            />
            <input
              name="currency"
              className="field"
              defaultValue="EUR"
              required
            />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">Split among</p>
            {members.map((m) => (
              <label key={m.user_id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(m.user_id)}
                  onChange={(e) => {
                    setSelected((prev) =>
                      e.target.checked
                        ? [...prev, m.user_id]
                        : prev.filter((id) => id !== m.user_id),
                    );
                  }}
                />
                {profiles[m.user_id]?.display_name || "Traveler"}
                {m.user_id === userId ? " (you)" : ""}
              </label>
            ))}
          </div>
          <p className="text-xs text-ink-soft">
            You paid the bill. Your own share is marked settled automatically;
            mark others paid when they repay you.
          </p>
          <input
            name="custom_shares"
            className="field"
            placeholder="optional custom shares: userId=amount,..."
          />
          <button className="btn btn-primary" type="submit">
            Save payment
          </button>
        </form>
      )}

      <div className="space-y-3">
        {payments.map((p) => (
          <div
            key={p.id}
            id={p.id}
            className={`panel ${focusId === p.id ? "ring-2 ring-coral" : ""}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{p.description}</p>
                <p className="text-sm text-ink-soft">
                  {formatMoney(Number(p.amount), p.currency)} · paid by{" "}
                  {profiles[p.created_by]?.display_name || "someone"}
                </p>
              </div>
            </div>
            <ul className="mt-3 space-y-2">
              {(p.expense_shares || []).map((s) => {
                const paid = isPaid(s);
                const isPayerShare = s.user_id === p.created_by;
                const name =
                  profiles[s.user_id]?.display_name || "Traveler";

                return (
                  <li
                    key={s.id}
                    id={s.id}
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-3 text-sm ring-1 ${
                      focusId === s.id ? "ring-2 ring-coral" : ""
                    } ${
                      paid
                        ? "bg-leaf/10 ring-leaf/30 text-ink"
                        : "bg-coral/10 ring-coral/40 text-ink"
                    }`}
                  >
                    <div>
                      <p className="font-semibold">
                        {name}
                        {s.user_id === userId ? " (you)" : ""}
                      </p>
                      <p
                        className={`text-sm ${
                          paid ? "text-leaf line-through opacity-80" : "text-coral"
                        }`}
                      >
                        {paid ? "Settled" : "Still owes"}{" "}
                        {formatMoney(Number(s.share_amount), p.currency)}
                      </p>
                    </div>

                    {isPayerShare ? (
                      <span className="rounded-full bg-leaf/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-leaf">
                        Covered (paid the bill)
                      </span>
                    ) : canMarkPaid(p.created_by) ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => togglePaid(s, p, !paid)}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                          paid
                            ? "bg-leaf text-white hover:bg-leaf/90"
                            : "bg-coral text-white hover:bg-coral/90"
                        }`}
                      >
                        {paid ? "Paid ✓ — undo" : "Mark paid"}
                      </button>
                    ) : (
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                          paid
                            ? "bg-leaf/20 text-leaf"
                            : "bg-coral/20 text-coral"
                        }`}
                      >
                        {paid ? "Paid" : "Unpaid"}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
