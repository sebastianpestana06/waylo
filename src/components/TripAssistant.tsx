"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type ActionKind =
  | "create_expense"
  | "add_checklist"
  | "add_segment"
  | "add_deadline"
  | "add_itinerary";

const ACTION_OPTIONS: { value: ActionKind; label: string }[] = [
  { value: "create_expense", label: "Add payment (Money)" },
  { value: "add_checklist", label: "Add checklist item (Plan)" },
  { value: "add_segment", label: "Add travel leg (Calendar)" },
  { value: "add_deadline", label: "Add booking deadline (Calendar)" },
  { value: "add_itinerary", label: "Add itinerary activity (Plan)" },
];

export function TripAssistant({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<ActionKind>("create_expense");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Payment
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [description, setDescription] = useState("");

  // Checklist
  const [checklistText, setChecklistText] = useState("");

  // Segment
  const [mode, setMode] = useState("plane");
  const [fromPlace, setFromPlace] = useState("");
  const [toPlace, setToPlace] = useState("");

  // Deadline
  const [deadlineLabel, setDeadlineLabel] = useState("");
  const [dueDate, setDueDate] = useState("");

  // Itinerary
  const [dayDate, setDayDate] = useState("");
  const [itinTitle, setItinTitle] = useState("");
  const [itinNotes, setItinNotes] = useState("");
  const [itinMapsUrl, setItinMapsUrl] = useState("");

  const fields = useMemo(() => {
    switch (kind) {
      case "create_expense":
        return (
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              className="field"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <select
              className="field"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
              <option value="JPY">JPY</option>
              <option value="KRW">KRW</option>
            </select>
            <input
              className="field sm:col-span-2"
              placeholder="What was it for? e.g. Accommodation in Kyoto"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
        );
      case "add_checklist":
        return (
          <input
            className="field"
            placeholder="Checklist item"
            value={checklistText}
            onChange={(e) => setChecklistText(e.target.value)}
            required
          />
        );
      case "add_segment":
        return (
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              className="field sm:col-span-2"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="plane">Plane</option>
              <option value="train_hs">High-speed train</option>
              <option value="train_regional">Regional train</option>
              <option value="car">Car</option>
              <option value="bus">Bus</option>
              <option value="ferry">Ferry</option>
              <option value="other">Other</option>
            </select>
            <input
              className="field"
              placeholder="From"
              value={fromPlace}
              onChange={(e) => setFromPlace(e.target.value)}
              required
            />
            <input
              className="field"
              placeholder="To"
              value={toPlace}
              onChange={(e) => setToPlace(e.target.value)}
              required
            />
          </div>
        );
      case "add_deadline":
        return (
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              className="field"
              placeholder="Deadline label"
              value={deadlineLabel}
              onChange={(e) => setDeadlineLabel(e.target.value)}
              required
            />
            <input
              className="field"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </div>
        );
      case "add_itinerary":
        return (
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              className="field"
              type="date"
              value={dayDate}
              onChange={(e) => setDayDate(e.target.value)}
              required
            />
            <input
              className="field"
              placeholder="Activity title"
              value={itinTitle}
              onChange={(e) => setItinTitle(e.target.value)}
              required
            />
            <input
              className="field sm:col-span-2"
              placeholder="Notes (optional)"
              value={itinNotes}
              onChange={(e) => setItinNotes(e.target.value)}
            />
            <input
              className="field sm:col-span-2"
              type="url"
              placeholder="Maps link (optional) e.g. https://maps.google.com/..."
              value={itinMapsUrl}
              onChange={(e) => setItinMapsUrl(e.target.value)}
            />
          </div>
        );
    }
  }, [
    kind,
    amount,
    currency,
    description,
    checklistText,
    mode,
    fromPlace,
    toPlace,
    deadlineLabel,
    dueDate,
    dayDate,
    itinTitle,
    itinNotes,
    itinMapsUrl,
  ]);

  function buildMessage(): string {
    switch (kind) {
      case "create_expense":
        return `paid ${amount} ${currency} for ${description}`;
      case "add_checklist":
        return `add checklist: ${checklistText}`;
      case "add_segment":
        return `add ${mode} travel from ${fromPlace} to ${toPlace}`;
      case "add_deadline":
        return `add booking deadline "${deadlineLabel}" on ${dueDate}`;
      case "add_itinerary":
        return `add itinerary on ${dayDate}: ${itinTitle}${itinNotes ? ` — ${itinNotes}` : ""}${itinMapsUrl ? ` maps: ${itinMapsUrl}` : ""}`;
    }
  }

  function buildStructuredAction() {
    switch (kind) {
      case "create_expense":
        return {
          type: "create_expense" as const,
          amount: Number(amount),
          currency,
          description: description.trim(),
        };
      case "add_checklist":
        return { type: "add_checklist" as const, text: checklistText.trim() };
      case "add_segment":
        return {
          type: "add_segment" as const,
          mode: mode as
            | "plane"
            | "train_hs"
            | "train_regional"
            | "car"
            | "bus"
            | "ferry"
            | "other",
          from_place: fromPlace.trim(),
          to_place: toPlace.trim(),
          depart_at: null,
          arrive_at: null,
        };
      case "add_deadline":
        return {
          type: "add_deadline" as const,
          label: deadlineLabel.trim(),
          due_date: dueDate,
        };
      case "add_itinerary":
        return {
          type: "add_itinerary" as const,
          day_date: dayDate,
          title: itinTitle.trim(),
          notes: itinNotes.trim() || null,
          maps_url: itinMapsUrl.trim() || null,
        };
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setStatus(null);

    try {
      const res = await fetch(`/api/trips/${tripId}/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: buildMessage(),
          actions: [buildStructuredAction()],
          structured: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not apply update");
        setPending(false);
        return;
      }
      const applied = (data.applied as string[]) || [];
      setStatus(
        applied.length
          ? applied.join(" · ")
          : data.reply || "Update applied.",
      );
      // Reset payment fields after success
      if (kind === "create_expense") {
        setAmount("");
        setDescription("");
      }
      if (kind === "add_checklist") setChecklistText("");
      if (kind === "add_segment") {
        setFromPlace("");
        setToPlace("");
      }
      if (kind === "add_deadline") {
        setDeadlineLabel("");
        setDueDate("");
      }
      if (kind === "add_itinerary") {
        setItinTitle("");
        setItinNotes("");
        setItinMapsUrl("");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl">Quick update</h2>
          <p className="text-sm text-ink-soft">
            Pick what to add — payments are split across all trip members
          </p>
        </div>
        <Link href={`/trips/${tripId}/money`} className="btn btn-ghost text-xs">
          Open Money
        </Link>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block text-sm font-semibold">
          What do you want to do?
          <select
            className="field mt-1"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as ActionKind);
              setStatus(null);
              setError(null);
            }}
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {fields}

        {error && (
          <p className="rounded-xl bg-coral/10 px-3 py-2 text-sm text-coral">
            {error}
          </p>
        )}
        {status && (
          <p className="rounded-xl bg-leaf/10 px-3 py-2 text-sm text-leaf">
            {status}
          </p>
        )}

        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Apply update"}
        </button>
      </form>
    </section>
  );
}
