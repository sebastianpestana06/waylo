"use client";

import { useState, useTransition } from "react";
import { deleteTrip } from "@/lib/actions";

export function DeleteTripButton({
  tripId,
  tripTitle,
}: {
  tripId: string;
  tripTitle: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onDelete() {
    const ok = window.confirm(
      `Delete “${tripTitle}” permanently? This cannot be undone.`,
    );
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteTrip(tripId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not delete trip");
      }
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="btn w-full bg-coral/10 text-coral ring-1 ring-coral/30 hover:bg-coral/20"
        disabled={pending}
        onClick={onDelete}
      >
        {pending ? "Deleting…" : "Delete trip"}
      </button>
      {error && (
        <p className="rounded-xl bg-coral/10 px-3 py-2 text-sm text-coral">
          {error}
        </p>
      )}
    </div>
  );
}
