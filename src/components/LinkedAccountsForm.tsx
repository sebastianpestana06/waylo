"use client";

import { useMemo, useState } from "react";
import {
  LINK_TYPE_OPTIONS,
  createAccountFromUrl,
  parseServiceUrl,
} from "@/lib/linked-accounts";
import type { PopularSite } from "@/lib/popular-sites";
import type { LinkedAccount, LinkedAccountType } from "@/lib/types";
import { PopularSitePicker } from "@/components/PopularSitePicker";

type Row = LinkedAccount & { key: string };

function toRow(account: LinkedAccount): Row {
  return {
    key: account.id,
    ...account,
    value: account.value || "",
    notes: account.notes || "",
  };
}

export function LinkedAccountsForm({
  initialAccounts,
  frequentFlyersDefault,
}: {
  initialAccounts: LinkedAccount[];
  frequentFlyersDefault: string;
}) {
  const seeded = useMemo(
    () => initialAccounts.map(toRow),
    [initialAccounts],
  );
  const [rows, setRows] = useState<Row[]>(seeded);
  const [pasteUrl, setPasteUrl] = useState("");
  const [pasteError, setPasteError] = useState("");
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const excludeProviders = useMemo(
    () => rows.flatMap((r) => [r.provider, r.hostname.replace(/^www\./, "")]),
    [rows],
  );

  function update(id: string, patch: Partial<Row>) {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  function tryAddFromUrl(
    rawUrl: string,
    options?: { errorPrefix?: string; label?: string },
  ) {
    setPasteError("");
    const account = createAccountFromUrl(rawUrl, { label: options?.label });
    if (!account) {
      setPasteError(
        options?.errorPrefix ||
          "Paste a full website URL, e.g. https://www.booking.com",
      );
      return false;
    }
    const already = rows.some(
      (r) => r.provider === account.provider || r.hostname === account.hostname,
    );
    if (already) {
      setPasteError("That website is already on your list.");
      return false;
    }
    setRows((prev) => [...prev, toRow(account)]);
    return true;
  }

  function addFromPaste() {
    if (tryAddFromUrl(pasteUrl)) setPasteUrl("");
  }

  function addFromPopular(site: PopularSite) {
    tryAddFromUrl(site.url, {
      errorPrefix: `Could not add ${site.label}.`,
      label: site.label,
    });
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
    if (connectingId === id) setConnectingId(null);
  }

  function startConnect(row: Row) {
    window.open(row.siteUrl, "_blank", "noopener,noreferrer");
    setConnectingId(row.id);
  }

  function confirmLink(id: string) {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              status: "linked" as const,
              enabled: true,
              linkedAt: new Date().toISOString(),
            }
          : row,
      ),
    );
    setConnectingId(null);
  }

  function unlink(id: string) {
    update(id, {
      status: "added",
      enabled: false,
      linkedAt: undefined,
      value: "",
    });
    setConnectingId(null);
  }

  const preview = parseServiceUrl(pasteUrl);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Linked services</h3>
        <p className="mt-1 text-xs text-ink-soft">
          Pick a popular site by feature, or paste any URL. Then sign in on that
          site and confirm here to link it to Waylo. Waylo never asks for that
          site&apos;s password.
        </p>
      </div>

      <div className="space-y-3 rounded-xl bg-white/70 p-3 ring-1 ring-line/40">
        <PopularSitePicker
          excludeProviders={excludeProviders}
          onSelect={addFromPopular}
        />

        <div className="border-t border-line/40 pt-3">
          <label className="block text-xs text-ink-soft">
            Or paste a website URL
            <input
              type="url"
              className="field mt-1"
              value={pasteUrl}
              onChange={(e) => {
                setPasteUrl(e.target.value);
                setPasteError("");
              }}
              placeholder="https://www.example.com/..."
            />
          </label>
          {preview ? (
            <p className="mt-1 text-xs text-ink-soft">
              Will add:{" "}
              <span className="font-medium text-ink">{preview.label}</span> (
              {preview.provider})
            </p>
          ) : null}
          {pasteError ? (
            <p className="mt-1 text-xs text-red-700">{pasteError}</p>
          ) : null}
          <button
            type="button"
            className="btn btn-primary mt-2 text-sm"
            onClick={addFromPaste}
          >
            Add from URL
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-ink-soft">
          No services yet. Choose a popular site or paste a URL above.
        </p>
      ) : null}

      {rows.map((row, index) => {
        const isConnecting = connectingId === row.id;
        const isLinked = row.status === "linked";

        return (
          <div
            key={row.key}
            className="space-y-2 rounded-xl bg-white/70 p-3 ring-1 ring-line/40"
          >
            <input type="hidden" name="account_id" value={row.id} />
            <input
              type="hidden"
              name={`account_provider_${index}`}
              value={row.provider}
            />
            <input
              type="hidden"
              name={`account_label_${index}`}
              value={row.label}
            />
            <input
              type="hidden"
              name={`account_site_url_${index}`}
              value={row.siteUrl}
            />
            <input
              type="hidden"
              name={`account_hostname_${index}`}
              value={row.hostname}
            />
            <input
              type="hidden"
              name={`account_status_${index}`}
              value={row.status}
            />
            <input
              type="hidden"
              name={`account_linked_at_${index}`}
              value={row.linkedAt || ""}
            />
            {isLinked ? (
              <input type="hidden" name={`account_enabled_${index}`} value="on" />
            ) : (
              <input type="hidden" name={`account_enabled_${index}`} value="" />
            )}

            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{row.label}</p>
                <a
                  href={row.siteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-ink-soft underline-offset-2 hover:underline"
                >
                  {row.provider}
                </a>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                  isLinked
                    ? "bg-emerald-100 text-emerald-900"
                    : "bg-amber-100 text-amber-900"
                }`}
              >
                {isLinked ? "Linked" : "Added — not linked"}
              </span>
            </div>

            {!isLinked && !isConnecting ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-primary text-sm"
                  onClick={() => startConnect(row)}
                >
                  Sign in to connect
                </button>
                <button
                  type="button"
                  className="btn btn-ghost text-sm"
                  onClick={() => removeRow(row.id)}
                >
                  Remove
                </button>
              </div>
            ) : null}

            {!isLinked && isConnecting ? (
              <div className="space-y-2 rounded-lg bg-sand/40 p-3">
                <p className="text-sm">
                  Sign in on <strong>{row.label}</strong> in the new tab, then
                  confirm below to link it to Waylo.
                </p>
                <label className="block text-xs text-ink-soft">
                  How you sign in there (optional)
                  <select
                    name={`account_link_type_${index}`}
                    className="field mt-1"
                    value={row.linkType}
                    onChange={(e) =>
                      update(row.id, {
                        linkType: e.target.value as LinkedAccountType,
                      })
                    }
                  >
                    {LINK_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                {row.linkType !== "none" ? (
                  <label className="block text-xs text-ink-soft">
                    {row.linkType === "email"
                      ? "Account email"
                      : row.linkType === "username"
                        ? "Username"
                        : row.linkType === "loyalty"
                          ? "Loyalty number"
                          : "Member ID"}
                    <input
                      name={`account_value_${index}`}
                      className="field mt-1"
                      value={row.value || ""}
                      onChange={(e) =>
                        update(row.id, { value: e.target.value })
                      }
                      placeholder="Helps trip mates know which account you use"
                    />
                  </label>
                ) : (
                  <input
                    type="hidden"
                    name={`account_value_${index}`}
                    value=""
                  />
                )}
                <label className="block text-xs text-ink-soft">
                  Notes (optional)
                  <input
                    name={`account_notes_${index}`}
                    className="field mt-1"
                    value={row.notes || ""}
                    onChange={(e) => update(row.id, { notes: e.target.value })}
                    placeholder="e.g. Genius level 2 · book under this email"
                  />
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    className="btn btn-primary text-sm"
                    onClick={() => confirmLink(row.id)}
                  >
                    I&apos;ve signed in — link to Waylo
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost text-sm"
                    onClick={() => setConnectingId(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {isLinked ? (
              <div className="space-y-2">
                <input
                  type="hidden"
                  name={`account_link_type_${index}`}
                  value={row.linkType}
                />
                <input
                  type="hidden"
                  name={`account_value_${index}`}
                  value={row.value || ""}
                />
                <label className="block text-xs text-ink-soft">
                  Notes for trip mates
                  <input
                    name={`account_notes_${index}`}
                    className="field mt-1"
                    value={row.notes || ""}
                    onChange={(e) => update(row.id, { notes: e.target.value })}
                  />
                </label>
                {row.value ? (
                  <p className="text-xs text-ink-soft">
                    Linked as {row.linkType.replace("_", " ")}:{" "}
                    <span className="font-medium text-ink">{row.value}</span>
                  </p>
                ) : (
                  <p className="text-xs text-ink-soft">
                    Linked without a public ID.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost text-sm"
                    onClick={() => unlink(row.id)}
                  >
                    Unlink
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost text-sm"
                    onClick={() => removeRow(row.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : null}

            {!isLinked && !isConnecting ? (
              <>
                <input
                  type="hidden"
                  name={`account_link_type_${index}`}
                  value={row.linkType}
                />
                <input
                  type="hidden"
                  name={`account_value_${index}`}
                  value={row.value || ""}
                />
                <input
                  type="hidden"
                  name={`account_notes_${index}`}
                  value={row.notes || ""}
                />
              </>
            ) : null}
          </div>
        );
      })}

      <label className="block text-sm">
        <span className="font-semibold">Airline frequent flyers</span>
        <span className="mt-0.5 block text-xs text-ink-soft">
          One per line: Airline: number
        </span>
        <textarea
          name="frequent_flyers"
          className="field mt-2 min-h-24"
          defaultValue={frequentFlyersDefault}
          placeholder={"KLM: 123456\nBA: 987654"}
        />
      </label>
    </div>
  );
}
