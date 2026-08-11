import type {
  LinkedAccount,
  LinkedAccountStatus,
  LinkedAccountType,
  Memberships,
} from "./types";

/** Known hosts → nicer display names + calendar search helpers */
export const KNOWN_SITES: Record<
  string,
  { label: string; providerKey: "booking" | "agoda" | "skyscanner" | null }
> = {
  "booking.com": { label: "Booking.com", providerKey: "booking" },
  "www.booking.com": { label: "Booking.com", providerKey: "booking" },
  "agoda.com": { label: "Agoda", providerKey: "agoda" },
  "www.agoda.com": { label: "Agoda", providerKey: "agoda" },
  "skyscanner.net": { label: "Skyscanner", providerKey: "skyscanner" },
  "www.skyscanner.net": { label: "Skyscanner", providerKey: "skyscanner" },
  "skyscanner.com": { label: "Skyscanner", providerKey: "skyscanner" },
  "www.skyscanner.com": { label: "Skyscanner", providerKey: "skyscanner" },
  "expedia.com": { label: "Expedia", providerKey: null },
  "www.expedia.com": { label: "Expedia", providerKey: null },
  "airbnb.com": { label: "Airbnb", providerKey: null },
  "www.airbnb.com": { label: "Airbnb", providerKey: null },
  "hotels.com": { label: "Hotels.com", providerKey: null },
  "www.hotels.com": { label: "Hotels.com", providerKey: null },
};

export const LINK_TYPE_OPTIONS: {
  value: LinkedAccountType;
  label: string;
}[] = [
  { value: "email", label: "Account email" },
  { value: "username", label: "Username / login name" },
  { value: "member_id", label: "Member / Genius / rewards ID" },
  { value: "loyalty", label: "Loyalty number" },
  { value: "none", label: "No ID — just mark as linked" },
];

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `svc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function titleFromHostname(hostname: string) {
  const known = KNOWN_SITES[hostname.toLowerCase()];
  if (known) return known.label;
  const bare = hostname.replace(/^www\./i, "");
  const name = bare.split(".")[0] || bare;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Normalize pasted text into a URL + site metadata. */
export function parseServiceUrl(raw: string): {
  siteUrl: string;
  hostname: string;
  provider: string;
  label: string;
} | null {
  let input = raw.trim();
  if (!input) return null;
  if (!/^https?:\/\//i.test(input)) {
    input = `https://${input}`;
  }
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (!url.hostname || !url.hostname.includes(".")) return null;

  const hostname = url.hostname.toLowerCase();
  const provider = hostname.replace(/^www\./, "");
  const origin = url.origin;
  const known = KNOWN_SITES[hostname] || KNOWN_SITES[provider];

  return {
    siteUrl: origin,
    hostname,
    provider,
    label: known?.label || titleFromHostname(hostname),
  };
}

function legacyToAccount(
  provider: string,
  value: string | undefined,
  siteUrl: string,
  label: string,
): LinkedAccount | null {
  const v = (value || "").trim();
  if (!v) return null;
  const looksEmail = v.includes("@");
  return {
    id: newId(),
    provider,
    label,
    siteUrl,
    hostname: new URL(siteUrl).hostname,
    status: "linked",
    linkType: looksEmail ? "email" : "member_id",
    value: v,
    notes: "",
    enabled: true,
    linkedAt: new Date().toISOString(),
  };
}

function coerceAccount(raw: Partial<LinkedAccount> & { provider: string }): LinkedAccount {
  const siteUrl =
    raw.siteUrl ||
    (raw.provider.includes(".")
      ? `https://${raw.provider}`
      : `https://www.${raw.provider}.com`);
  let hostname = raw.hostname || "";
  try {
    hostname = hostname || new URL(siteUrl).hostname;
  } catch {
    hostname = raw.provider;
  }
  const provider = raw.provider.includes(".")
    ? raw.provider.replace(/^www\./, "")
    : hostname.replace(/^www\./, "");

  let status: LinkedAccountStatus = "added";
  if (raw.status === "linked" || raw.status === "added") {
    status = raw.status;
  } else if (raw.enabled) {
    status = "linked";
  }

  return {
    id: raw.id || newId(),
    provider,
    label: raw.label || titleFromHostname(hostname),
    siteUrl,
    hostname,
    status,
    linkType: raw.linkType || "none",
    value: raw.value || "",
    notes: raw.notes || "",
    enabled: status === "linked" ? raw.enabled !== false : false,
    linkedAt: raw.linkedAt,
  };
}

/** Normalize memberships JSON into the accounts[] shape. */
export function normalizeLinkedAccounts(
  memberships: Memberships | null | undefined,
): LinkedAccount[] {
  const m = memberships || {};
  if (m.accounts?.length) {
    return m.accounts.map((a) =>
      coerceAccount({
        ...a,
        provider: a.provider,
      }),
    );
  }

  const fromLegacy = [
    legacyToAccount("booking.com", m.booking, "https://www.booking.com", "Booking.com"),
    legacyToAccount("agoda.com", m.agoda, "https://www.agoda.com", "Agoda"),
    legacyToAccount(
      "skyscanner.net",
      m.skyscanner,
      "https://www.skyscanner.net",
      "Skyscanner",
    ),
  ].filter(Boolean) as LinkedAccount[];

  return fromLegacy;
}

export function accountsToBookingPrefs(accounts: LinkedAccount[]) {
  const linked = accounts.filter((a) => a.status === "linked" && a.enabled);
  const has = (key: "booking" | "agoda" | "skyscanner") =>
    linked.some((a) => {
      const known =
        KNOWN_SITES[a.hostname] || KNOWN_SITES[a.provider] || KNOWN_SITES[`www.${a.provider}`];
      return known?.providerKey === key;
    });

  return {
    skyscanner: has("skyscanner"),
    booking: has("booking"),
    agoda: has("agoda"),
  };
}

export function parseLinkedAccountsFromForm(formData: FormData): {
  accounts: LinkedAccount[];
  frequentFlyers: { airline: string; number: string }[];
} {
  const ids = formData.getAll("account_id").map(String);
  const accounts: LinkedAccount[] = [];

  ids.forEach((id, index) => {
    const provider = String(formData.get(`account_provider_${index}`) || "").trim();
    const label = String(formData.get(`account_label_${index}`) || "").trim();
    const siteUrl = String(formData.get(`account_site_url_${index}`) || "").trim();
    const hostname = String(formData.get(`account_hostname_${index}`) || "").trim();
    const status = String(
      formData.get(`account_status_${index}`) || "added",
    ) as LinkedAccountStatus;
    const linkType = String(
      formData.get(`account_link_type_${index}`) || "none",
    ) as LinkedAccountType;
    const value = String(formData.get(`account_value_${index}`) || "").trim();
    const notes = String(formData.get(`account_notes_${index}`) || "").trim();
    const linkedAt = String(formData.get(`account_linked_at_${index}`) || "").trim();
    const enabled = formData.get(`account_enabled_${index}`) === "on";

    if (!provider || !siteUrl) return;

    accounts.push(
      coerceAccount({
        id: id || newId(),
        provider,
        label: label || titleFromHostname(hostname || provider),
        siteUrl,
        hostname,
        status,
        linkType,
        value: linkType === "none" ? "" : value,
        notes,
        enabled: status === "linked" ? enabled : false,
        linkedAt: linkedAt || undefined,
      }),
    );
  });

  const frequentFlyersRaw = String(formData.get("frequent_flyers") || "");
  const frequentFlyers = frequentFlyersRaw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [airline, number] = line.split(":").map((s) => s.trim());
      return { airline: airline || "Airline", number: number || "" };
    });

  return { accounts, frequentFlyers };
}

export function createAccountFromUrl(
  rawUrl: string,
  overrides?: { label?: string },
): LinkedAccount | null {
  const parsed = parseServiceUrl(rawUrl);
  if (!parsed) return null;
  return {
    id: newId(),
    provider: parsed.provider,
    label: overrides?.label || parsed.label,
    siteUrl: parsed.siteUrl,
    hostname: parsed.hostname,
    status: "added",
    linkType: "email",
    value: "",
    notes: "",
    enabled: false,
  };
}
