import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProject } from "@/lib/store/useReady";
import { evaluate } from "@/lib/cost/model";
import { fmtEighths, money } from "@/lib/types";
import { StripBody } from "@/components/app/Strip";
import { castIdMap } from "./$id.schedule";

export const Route = createFileRoute("/project/$id/print")({ head: () => ({ meta: [
    { title: "Printable Schedule — SlateLogic" },
    { name: "description", content: "Print a day-by-day shooting schedule with scene strips, cast and estimated costs." },
    { property: "og:title", content: "Printable Schedule — SlateLogic" },
    { property: "og:description", content: "Print a day-by-day shooting schedule with scene strips, cast and estimated costs." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }), component: PrintPage });

function PrintPage() {
  const { id } = Route.useParams();
  const p = useProject(id)!;
  const map = useMemo(() => new Map(p.scenes.map((s) => [s.id, s])), [p.scenes]);
  const b = useMemo(() => evaluate(p.days, map, p.settings), [p.days, map, p.settings]);
  const castIds = castIdMap(p);
  return (
    <main className="mx-auto max-w-4xl px-6 py-8 print:max-w-none print:p-0">
      <div className="mb-6 flex items-center print:hidden">
        <p className="font-mono text-sm text-muted-foreground">Preview of the printed shooting schedule.</p>
        <Button className="ml-auto" onClick={() => window.print()}><Printer /> Print</Button>
      </div>
      <header className="mb-4 border-b-4 border-double border-foreground pb-2">
        <h1 className="text-4xl font-bold uppercase">{p.name}</h1>
        <p className="font-mono text-sm">Shooting schedule · {p.days.length} days · est. {money(b.total)}</p>
      </header>
      {p.days.map((d, i) => {
        const dc = b.days[i]!;
        return (
          <section key={d.id} className="mb-4 break-inside-avoid border border-foreground">
            <div className="flex gap-4 bg-day-break px-2 py-1 font-mono text-xs text-day-break-foreground print:[print-color-adjust:exact]">
              <b>END OF DAY {i + 1}</b><span>{fmtEighths(dc.eighths)} pgs</span><span>{dc.hours.toFixed(1)} h</span><span>{dc.moves} moves</span><span className="ml-auto">{money(dc.total)}</span>
            </div>
            {d.sceneIds.map((sid) => { const s = map.get(sid); return s ? <StripBody key={sid} s={s} castIds={castIds} className="print:[print-color-adjust:exact]" /> : null; })}
          </section>
        );
      })}
      <section className="break-inside-avoid font-mono text-xs">
        <h2 className="mb-1 text-xl font-bold uppercase">Cast</h2>
        <ul className="columns-3">{[...castIds].map(([n, i]) => <li key={n}>{i}. {n}</li>)}</ul>
      </section>
    </main>
  );
}
