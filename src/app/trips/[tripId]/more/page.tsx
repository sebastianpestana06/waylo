import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  createMeeting,
  removeMember,
  runVisaCheck,
  updateMemberRole,
  uploadTripDocument,
  voteMeeting,
} from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";
import type {
  MeetingProposal,
  Profile,
  Trip,
  TripDocument,
  TripMember,
  VisaCheckResult,
} from "@/lib/types";

export default async function MorePage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: trip },
    { data: member },
    { data: members },
    { data: docs },
    { data: meetings },
  ] = await Promise.all([
    supabase.from("trips").select("*").eq("id", tripId).single(),
    supabase
      .from("trip_members")
      .select("role")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .single(),
    supabase.from("trip_members").select("*, profiles(*)").eq("trip_id", tripId),
    supabase.from("trip_documents").select("*").eq("trip_id", tripId),
    supabase.from("meeting_proposals").select("*").eq("trip_id", tripId),
  ]);

  if (!trip || !member) notFound();
  const t = trip as Trip;
  const canEdit = member.role === "owner" || member.role === "editor";
  const isOwner = member.role === "owner";
  const origin =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteEditor = `${origin}/invite/${t.invite_token}?role=editor`;
  const inviteViewer = `${origin}/invite/${t.invite_token}?role=viewer`;
  const visa = t.last_visa_check as VisaCheckResult | null;

  const profiles: Record<string, Profile> = {};
  for (const m of (members || []) as TripMember[]) {
    if (m.profiles) profiles[m.user_id] = m.profiles as Profile;
  }

  return (
    <div className="space-y-6 animate-fade">
      <section className="panel space-y-2">
        <h2 className="font-display text-xl">Share</h2>
        <p className="text-sm text-ink-soft">Google Docs–style invite links</p>
        <label className="block text-xs font-semibold">Editor link</label>
        <input className="field text-xs" readOnly value={inviteEditor} />
        <label className="block text-xs font-semibold">Viewer link</label>
        <input className="field text-xs" readOnly value={inviteViewer} />
      </section>

      <section className="panel space-y-2">
        <h2 className="font-display text-xl">Collaborators</h2>
        <ul className="space-y-2">
          {((members || []) as TripMember[]).map((m) => (
            <li
              key={m.user_id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-line/40"
            >
              <span>
                {profiles[m.user_id]?.display_name || "Traveler"} · {m.role}
                {profiles[m.user_id]?.home_timezone
                  ? ` · ${profiles[m.user_id]?.home_timezone}`
                  : ""}
              </span>
              {isOwner && m.role !== "owner" && (
                <div className="flex gap-2">
                  <form
                    action={updateMemberRole.bind(
                      null,
                      tripId,
                      m.user_id,
                      m.role === "editor" ? "viewer" : "editor",
                    )}
                  >
                    <button className="text-sea" type="submit">
                      Make {m.role === "editor" ? "viewer" : "editor"}
                    </button>
                  </form>
                  <form action={removeMember.bind(null, tripId, m.user_id)}>
                    <button className="text-coral" type="submit">
                      Remove
                    </button>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel space-y-3">
        <h2 className="font-display text-xl">VISA checker</h2>
        <p className="text-xs text-ink-soft">
          Uses your saved passports + AI guidance. Always verify officially.
        </p>
        {visa && (
          <div className="rounded-xl bg-sand-deep/40 p-3 text-sm">
            <p className="font-semibold">
              {visa.likely_required ? "Visa likely needed" : "Likely visa-free / unclear"}{" "}
              for {visa.destination}
            </p>
            <p className="mt-1">{visa.summary}</p>
          </div>
        )}
        {canEdit && (
          <form action={runVisaCheck.bind(null, tripId)} className="space-y-2">
            <input
              name="destination"
              className="field"
              placeholder="Destination country"
              defaultValue={t.destinations?.[0] || ""}
              required
            />
            <button className="btn btn-primary" type="submit">
              Check visa guidance
            </button>
          </form>
        )}
      </section>

      <section className="panel space-y-3">
        <h2 className="font-display text-xl">Document vault</h2>
        <ul className="space-y-2">
          {((docs || []) as TripDocument[]).map((d) => (
            <li key={d.id} className="text-sm">
              {d.label}{" "}
              <span className="text-ink-soft">({d.category})</span>
            </li>
          ))}
        </ul>
        {canEdit && (
          <form
            action={uploadTripDocument.bind(null, tripId)}
            className="space-y-2"
          >
            <input name="label" className="field" placeholder="Label" required />
            <select name="category" className="field" defaultValue="ticket">
              <option value="ticket">Ticket</option>
              <option value="insurance">Insurance</option>
              <option value="hotel">Hotel</option>
              <option value="other">Other</option>
            </select>
            <input name="file" type="file" className="field" required />
            <button className="btn btn-primary" type="submit">
              Upload
            </button>
          </form>
        )}
      </section>

      <section className="panel space-y-3">
        <h2 className="font-display text-xl">Meeting scheduler</h2>
        <p className="text-xs text-ink-soft">
          Propose UTC slots; each person sees their local timezone from Account
          settings.
        </p>
        {((meetings || []) as MeetingProposal[]).map((m) => (
          <div key={m.id} className="rounded-xl bg-white p-3 ring-1 ring-line/40">
            <p className="font-semibold">{m.title}</p>
            <ul className="mt-2 space-y-2">
              {m.candidate_slots.map((slot) => {
                const local = new Date(slot.start).toLocaleString(undefined, {
                  timeZone:
                    profiles[user.id]?.home_timezone ||
                    Intl.DateTimeFormat().resolvedOptions().timeZone,
                });
                return (
                  <li key={slot.start} className="text-sm">
                    <p>{local}</p>
                    {canEdit && (
                      <div className="mt-1 flex gap-2">
                        {(["yes", "no", "maybe"] as const).map((v) => (
                          <form
                            key={v}
                            action={voteMeeting.bind(
                              null,
                              tripId,
                              m.id,
                              slot.start,
                              v,
                            )}
                          >
                            <button className="btn btn-ghost text-xs" type="submit">
                              {v}
                            </button>
                          </form>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {canEdit && (
          <form action={createMeeting.bind(null, tripId)} className="space-y-2">
            <input
              name="title"
              className="field"
              defaultValue="Planning call"
              required
            />
            <textarea
              name="slots"
              className="field min-h-24"
              placeholder={
                "One slot per line as ISO start,end\n2026-09-01T18:00:00Z,2026-09-01T19:00:00Z"
              }
              required
            />
            <button className="btn btn-primary" type="submit">
              Propose meeting
            </button>
          </form>
        )}
      </section>

      <section className="panel space-y-2">
        <h2 className="font-display text-xl">Export</h2>
        <div className="flex flex-wrap gap-2">
          <a
            className="btn btn-ghost"
            href={`/api/trips/${tripId}/ics`}
          >
            Download ICS
          </a>
          <Link
            className="btn btn-ghost"
            href={`/trips/${tripId}/print`}
            target="_blank"
          >
            Print checklist
          </Link>
        </div>
      </section>
    </div>
  );
}
