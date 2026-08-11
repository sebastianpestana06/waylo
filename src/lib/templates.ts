import type { TravelMode } from "./types";

export const TRAVEL_MODE_META: Record<
  TravelMode,
  { label: string; color: string; emoji: string }
> = {
  plane: { label: "Plane", color: "#1d6f8a", emoji: "✈" },
  train_hs: { label: "High-speed train", color: "#c45c26", emoji: "🚄" },
  train_regional: { label: "Regional train", color: "#8b5e3c", emoji: "🚆" },
  car: { label: "Car", color: "#2f6b4f", emoji: "🚗" },
  bus: { label: "Bus", color: "#5b6b2f", emoji: "🚌" },
  ferry: { label: "Ferry", color: "#2a6f7a", emoji: "⛴" },
  other: { label: "Other", color: "#6b5b4b", emoji: "🧳" },
};

export type TripTemplate = {
  key: string;
  title: string;
  destinations: string[];
  checklist: string[];
  itineraryHints: string[];
};

export const TRIP_TEMPLATES: TripTemplate[] = [
  {
    key: "japan-2w",
    title: "Japan 2 weeks",
    destinations: ["Tokyo", "Kyoto", "Osaka"],
    checklist: [
      "Check visa / waiver eligibility",
      "Book flights",
      "Reserve JR Pass / rail",
      "Book first nights lodging",
      "Notify bank of travel",
      "Download offline maps",
      "Pack adapters (Type A/B)",
    ],
    itineraryHints: ["Arrive Tokyo", "Day trip Kamakura", "Shinkansen to Kyoto"],
  },
  {
    key: "europe-rail",
    title: "Europe rail",
    destinations: ["Paris", "Brussels", "Amsterdam"],
    checklist: [
      "Book Eurostar / high-speed legs",
      "City center hotels near stations",
      "Travel insurance",
      "Validate passport 9+ months",
      "Seat reservations where required",
    ],
    itineraryHints: ["Paris museums", "Brussels day", "Amsterdam canals"],
  },
  {
    key: "blank",
    title: "Blank trip",
    destinations: [],
    checklist: [
      "Agree dates with the group",
      "Set a rough budget",
      "Book transport",
      "Book accommodation",
      "Check visa requirements",
    ],
    itineraryHints: [],
  },
];
