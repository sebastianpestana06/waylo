export const APP_NAME = "Waylo";
export const APP_VERSION = "0.2.0";

export type TripRole = "owner" | "editor" | "viewer";

export type TravelMode =
  | "plane"
  | "train_hs"
  | "train_regional"
  | "car"
  | "bus"
  | "ferry"
  | "other";

export type LinkedAccountType =
  | "member_id"
  | "email"
  | "username"
  | "loyalty"
  | "none";

/** added = site saved from URL; linked = user confirmed connect after signing in on that site */
export type LinkedAccountStatus = "added" | "linked";

export type LinkedAccount = {
  id: string;
  /** Stable slug from hostname (e.g. booking.com) */
  provider: string;
  label: string;
  /** Origin or URL the user pasted */
  siteUrl: string;
  hostname: string;
  status: LinkedAccountStatus;
  linkType: LinkedAccountType;
  value?: string;
  notes?: string;
  /** When true, show this site in calendar deep links */
  enabled: boolean;
  linkedAt?: string;
};

export type Memberships = {
  /** Preferred structured linked booking/travel accounts */
  accounts?: LinkedAccount[];
  /** Legacy string fields (migrated on save) */
  agoda?: string;
  booking?: string;
  skyscanner?: string;
  frequentFlyers?: { airline: string; number: string }[];
};

export type BookingPrefs = {
  skyscanner?: boolean;
  booking?: boolean;
  agoda?: boolean;
};

export type Profile = {
  id: string;
  display_name: string | null;
  home_timezone: string | null;
  memberships: Memberships;
  booking_prefs: BookingPrefs;
};

export type Passport = {
  id: string;
  user_id: string;
  issuing_country: string;
  passport_number: string | null;
  expiry_date: string;
  storage_path: string | null;
};

export type Trip = {
  id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  owner_id: string;
  invite_token: string;
  destinations: string[];
  countries?: string[] | null;
  cities?: string[] | null;
  template_key: string | null;
  last_visa_check: VisaCheckResult | null;
  /** Per-country visa guidance for the trip (newest batch). */
  visa_checks?: VisaCheckResult[] | null;
};

export type TripMember = {
  trip_id: string;
  user_id: string;
  role: TripRole;
  profiles?: Profile;
};

export type TravelSegment = {
  id: string;
  trip_id: string;
  mode: TravelMode;
  from_place: string;
  to_place: string;
  depart_at: string | null;
  arrive_at: string | null;
  booking_status: string;
  notes: string | null;
};

export type BookingDeadline = {
  id: string;
  trip_id: string;
  label: string;
  due_date: string;
  related_segment_id: string | null;
  done: boolean;
};

export type ChecklistItem = {
  id: string;
  trip_id: string;
  text: string;
  done: boolean;
  sort_order: number;
  assignee_id: string | null;
};

export type ItineraryItem = {
  id: string;
  trip_id: string;
  day_date: string;
  title: string;
  notes: string | null;
  maps_url: string | null;
  sort_order: number;
};

export type TripDocument = {
  id: string;
  trip_id: string;
  label: string;
  category: string;
  storage_path: string;
  uploaded_by: string | null;
};

export type ExpensePayment = {
  id: string;
  trip_id: string;
  created_by: string;
  description: string;
  amount: number;
  currency: string;
  created_at: string;
  expense_shares?: ExpenseShare[];
  creator?: Profile;
};

export type ExpenseShare = {
  id: string;
  payment_id: string;
  user_id: string;
  share_amount: number;
  paid: boolean;
  paid_at: string | null;
  marked_paid_by: string | null;
  profiles?: Profile;
};

export type MeetingProposal = {
  id: string;
  trip_id: string;
  created_by: string;
  title: string;
  candidate_slots: { start: string; end: string }[];
  availability: Record<string, Record<string, "yes" | "no" | "maybe">>;
};

export type VisaCheckResult = {
  destination: string;
  nationalities: string[];
  summary: string;
  likely_required: boolean;
  caveats: string[];
  checked_at: string;
};

/** Safe passport fields shared with trip mates (no numbers / scans). */
export type TripPassportSummary = {
  user_id: string;
  display_name: string;
  issuing_country: string;
  expiry_date: string;
  has_scan: boolean;
};

export type AccommodationSiteLink = {
  label: string;
  href: string;
};

/** Booking site ranked for how well it fits the Waylo filters (1–10). */
export type RankedBookingSite = {
  label: string;
  href: string;
  fit_score: number;
  why_fit: string;
  strengths?: string[];
  caveats?: string[];
};

/** @deprecated Kept for older saved searches; new searches store RankedBookingSite in results. */
export type AccommodationPhoto = {
  url: string;
  alt: string;
};

export type AccommodationSuggestion = {
  name: string;
  area: string;
  estimated_price_ppn: number;
  currency: string;
  estimated_station_km: number | null;
  nearest_station?: string | null;
  match_score: number;
  why_fit: string;
  style: string;
  amenities?: string[];
  highlights?: string[];
  guest_rating?: number | null;
  nights?: number;
  adults?: number;
  estimated_total_pp?: number | null;
  budget_ppn?: number | null;
  within_budget?: boolean;
  photos?: AccommodationPhoto[];
  site_links: AccommodationSiteLink[];
};

export type AccommodationSearch = {
  id: string;
  trip_id: string;
  created_by: string | null;
  city: string;
  check_in: string;
  check_out: string;
  max_station_km: number | null;
  budget_per_person_night: number;
  currency: string;
  adults: number;
  /** Optional until migrate_accommodation_rooms.sql is applied */
  rooms?: number;
  notes: string | null;
  ai_summary: string | null;
  site_links: AccommodationSiteLink[];
  /** Ranked booking sites (new) or legacy hotel suggestions */
  results: RankedBookingSite[] | AccommodationSuggestion[];
  created_at: string;
};

export type BookedStay = {
  id: string;
  trip_id: string;
  created_by: string | null;
  site_id: string;
  site_label: string;
  booking_id: string;
  property_name: string | null;
  city: string | null;
  check_in: string | null;
  check_out: string | null;
  notes: string | null;
  created_at: string;
};

export type ReminderItem = {
  id: string;
  priority: number;
  kind: "owe" | "awaiting" | "deadline" | "visa" | "passport" | "conflict";
  title: string;
  body: string;
  href: string;
  tripId?: string;
};
