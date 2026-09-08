import { segmentColor } from "@/lib/segment-colors";

export default function SegmentBadge({ segment }: { segment: string }) {
  const { fg, bg } = segmentColor(segment);
  return (
    <span className="pill" style={{ color: fg, background: bg }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: fg }} />
      {segment}
    </span>
  );
}
