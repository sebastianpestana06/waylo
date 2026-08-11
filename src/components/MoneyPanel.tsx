"use client";

import { createExpense, markSharePaid } from "@/lib/actions";
import { formatMoney } from "@/lib/alerts";
import { computeNetBalances } from "@/lib/settle";
import type { ExpensePayment, Profile, TripMember } from "@/lib/types";
import { useMemo, useState } from "react";

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
  const [selected, setSelected] = useState(
    members.map((m) => m.user_id),
  );
  const balances = useMemo(
    () => computeNetBalances(payments, profiles),
    [payments, profiles],
  );

  const isOwnerOrCreator = (createdBy: string) =>
    createdBy === userId ||
    members.find((m) => m.user_id === userId)?.role === "owner";

  return (
    <div className="space-y-4 animate-fade">
      <div className="panel">
        <h3 className="font-display text-xl">Settle-up</h3>
        <ul className="mt-3 space-y-2">
          {balances.length === 0 && (
            <li className="text-sm text-ink-soft">No outstanding balances.</li>
          )}
          {balances.map((b) => (
            <li
              key={b.userId}
              className="flex justify-between text-sm"
            >
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
              </label>
            ))}
          </div>
          <p className="text-xs text-ink-soft">
            Equal split by default. Optional custom: userId=amount,userId=amount
          </p>
          <input
            name="custom_shares"
            className="field"
            placeholder="optional custom shares"
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
            className={`panel ${
              focusId === p.id ? "ring-2 ring-coral" : ""
            }`}
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
              {(p.expense_shares || []).map((s) => (
                <li
                  key={s.id}
                  id={s.id}
                  className={`flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-line/40 ${
                    focusId === s.id ? "ring-2 ring-coral" : ""
                  }`}
                >
                  <span>
                    {profiles[s.user_id]?.display_name || "Traveler"} owes{" "}
                    {formatMoney(Number(s.share_amount), p.currency)}
                  </span>
                  {isOwnerOrCreator(p.created_by) ? (
                    <label className="flex items-center gap-2 text-xs font-semibold">
                      <input
                        type="checkbox"
                        checked={s.paid}
                        onChange={(e) =>
                          markSharePaid(tripId, s.id, e.target.checked)
                        }
                      />
                      Paid
                    </label>
                  ) : (
                    <span
                      className={
                        s.paid ? "text-leaf font-semibold" : "text-coral"
                      }
                    >
                      {s.paid ? "Paid" : "Unpaid"}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
