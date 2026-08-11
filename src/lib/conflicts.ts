import type { TravelSegment } from "./types";

export type SegmentConflict = {
  aId: string;
  bId: string;
  message: string;
};

export function detectSegmentConflicts(
  segments: TravelSegment[],
): SegmentConflict[] {
  const sorted = [...segments]
    .filter((s) => s.depart_at && s.arrive_at)
    .sort(
      (a, b) =>
        new Date(a.depart_at!).getTime() - new Date(b.depart_at!).getTime(),
    );

  const conflicts: SegmentConflict[] = [];

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];
      const aStart = new Date(a.depart_at!).getTime();
      const aEnd = new Date(a.arrive_at!).getTime();
      const bStart = new Date(b.depart_at!).getTime();
      const bEnd = new Date(b.arrive_at!).getTime();

      if (aStart < bEnd && bStart < aEnd) {
        conflicts.push({
          aId: a.id,
          bId: b.id,
          message: `Overlapping travel: ${a.from_place}→${a.to_place} and ${b.from_place}→${b.to_place}`,
        });
      }
    }

    if (i < sorted.length - 1) {
      const cur = sorted[i];
      const next = sorted[i + 1];
      if (
        new Date(cur.arrive_at!).getTime() >
        new Date(next.depart_at!).getTime()
      ) {
        conflicts.push({
          aId: cur.id,
          bId: next.id,
          message: `Impossible connection: arrive ${cur.to_place} after next departure to ${next.to_place}`,
        });
      }
    }
  }

  return conflicts;
}
