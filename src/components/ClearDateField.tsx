"use client";

import { useId, useState } from "react";
import { formatDateClear, toIsoDate } from "@/lib/dates";

/**
 * Date input that stores ISO (YYYY-MM-DD) but always shows the chosen date
 * as dd.mm.yyyy + long month name, so mm/dd browser chrome can’t be misread.
 */
export function ClearDateField({
  name,
  label,
  defaultValue = "",
  value,
  onChange,
  required,
  className = "",
}: {
  name?: string;
  label: string;
  defaultValue?: string;
  value?: string;
  onChange?: (iso: string) => void;
  required?: boolean;
  className?: string;
}) {
  const id = useId();
  const controlled = value !== undefined;
  const [inner, setInner] = useState(toIsoDate(defaultValue));
  const iso = controlled ? toIsoDate(value) : inner;
  const preview = formatDateClear(iso);

  return (
    <label className={`block text-xs text-ink-soft ${className}`} htmlFor={id}>
      {label}
      <input
        id={id}
        name={name}
        type="date"
        className="field mt-1"
        required={required}
        value={iso}
        onChange={(e) => {
          const next = toIsoDate(e.target.value);
          if (!controlled) setInner(next);
          onChange?.(next);
        }}
      />
      <span className="mt-1 block text-[11px] leading-snug text-ink-soft">
        Waylo uses <span className="font-medium text-ink">day.month.year</span>{" "}
        (dd.mm.yyyy), not month.day.year.
        {preview ? (
          <>
            {" "}
            Selected: <span className="font-medium text-ink">{preview}</span>
          </>
        ) : (
          " Pick a date to confirm."
        )}
      </span>
    </label>
  );
}
