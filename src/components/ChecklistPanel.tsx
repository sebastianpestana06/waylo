"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  addChecklistItem,
  deleteChecklistItem,
  toggleChecklistItem,
} from "@/lib/actions";
import type { ChecklistItem } from "@/lib/types";
import { ListChecks } from "lucide-react";

export function ChecklistPanel({
  tripId,
  initial,
  canEdit,
}: {
  tripId: string;
  initial: ChecklistItem[];
  canEdit: boolean;
}) {
  const [items, setItems] = useState(initial);

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`checklist-${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "checklist_items",
          filter: `trip_id=eq.${tripId}`,
        },
        async () => {
          const { data } = await supabase
            .from("checklist_items")
            .select("*")
            .eq("trip_id", tripId)
            .order("sort_order");
          if (data) setItems(data);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  return (
    <div className="panel space-y-3">
      <div className="flex items-center gap-2">
        <ListChecks size={18} className="text-sea" />
        <h3 className="font-display text-xl">Checklist</h3>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-line/50"
          >
            <input
              type="checkbox"
              checked={item.done}
              disabled={!canEdit}
              onChange={(e) =>
                toggleChecklistItem(tripId, item.id, e.target.checked)
              }
            />
            <span className={item.done ? "line-through text-ink-soft" : ""}>
              {item.text}
            </span>
            {canEdit && (
              <button
                className="ml-auto text-xs text-coral"
                onClick={() => deleteChecklistItem(tripId, item.id)}
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>
      {canEdit && (
        <form
          action={async (fd) => {
            await addChecklistItem(tripId, fd);
          }}
          className="flex gap-2"
        >
          <input
            name="text"
            className="field"
            placeholder="Add a planning task…"
            required
          />
          <button className="btn btn-primary" type="submit">
            Add
          </button>
        </form>
      )}
    </div>
  );
}
