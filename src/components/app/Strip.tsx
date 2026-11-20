import type { Scene } from "@/lib/types";
import { fmtEighths } from "@/lib/types";
import { cn } from "@/lib/utils";

export const stripClass = (s: Scene) =>
  s.time === "NIGHT" ? (s.intExt === "INT" ? "bg-strip-int-night" : "bg-strip-ext-night") : s.intExt === "INT" ? "bg-strip-int-day" : "bg-strip-ext-day";

export function StripBody({ s, castIds, className }: { s: Scene; castIds: Map<string, number>; className?: string }) {
  return (
    <div className={cn("grid grid-cols-[3rem_4.5rem_1fr_3.5rem] items-center gap-2 border-b border-strip-ink/30 px-2 py-1.5 font-mono text-xs text-strip-ink", stripClass(s), className)}>
      <span className="font-bold">{s.number}</span>
      <span>{s.intExt} {s.time === "NIGHT" ? "N" : "D"}</span>
      <span className="min-w-0">
        <span className="block truncate font-bold">{s.location}</span>
        <span className="block truncate opacity-70">{s.synopsis}</span>
      </span>
      <span className="text-right">{fmtEighths(s.eighths)}</span>
      <span className="col-span-4 truncate opacity-80">{s.cast.map((c) => castIds.get(c)).sort((a, b) => (a ?? 0) - (b ?? 0)).join(", ") || "—"}</span>
    </div>
  );
}
