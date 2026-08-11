export const APP_NAME = "Waylo";
export const APP_VERSION = "0.1.0";

export type TripRole = "owner" | "editor" | "viewer";

export type TravelMode =
  | "plane"
  | "train_hs"
  | "train_regional"
  | "car"
  | "bus"
  | "ferry"
  | "other";

export type Memberships = {
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
  template_key: string | null;
  last_visa_check: VisaCheckResult | null;
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

export type ReminderItem = {
  id: string;
  priority: number;
  kind: "owe" | "awaiting" | "deadline" | "visa" | "passport" | "conflict";
  title: string;
  body: string;
  href: string;
  tripId?: string;
};
