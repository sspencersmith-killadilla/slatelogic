import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useProjects } from "@/lib/store/projects";
import { useProject } from "@/lib/store/useReady";
import { defaultSettings, money, type Settings } from "@/lib/types";

export const Route = createFileRoute("/project/$id/costs")({ component: CostsPage });

type NumKey = { [K in keyof Settings]: Settings[K] extends number ? K : never }[keyof Settings];
const fields: { k: NumKey; label: string; hint: string; max: number; step: number; unit?: "$" | "8ths" | "hrs" }[] = [
  { k: "locationDayRate", label: "Location day rate", hint: "Default fee per location, per day it's used", max: 10000, step: 50, unit: "$" },
  { k: "companyMoveCost", label: "Company move", hint: "Cost each time the unit changes location within a day", max: 15000, step: 100, unit: "$" },
  { k: "actorDayRate", label: "Actor day rate", hint: "Default cost per work day", max: 5000, step: 25, unit: "$" },
  { k: "holdDayRate", label: "Hold day rate", hint: "Paid days between an actor's first and last day", max: 5000, step: 25, unit: "$" },
  { k: "turnaroundPenalty", label: "Night → Day turnaround", hint: "Penalty when a night shoot is followed by a day call", max: 15000, step: 100, unit: "$" },
  { k: "dayNightSwitchPenalty", label: "Day/Night switch in one day", hint: "Lighting & crew penalty for mixing DAY and NIGHT", max: 10000, step: 100, unit: "$" },
  { k: "maxEighthsPerDay", label: "Max pages per day", hint: "In eighths (40 = 5 pages)", max: 96, step: 1, unit: "8ths" },
  { k: "maxHoursPerDay", label: "Max hours per day", hint: "Shooting hours", max: 18, step: 0.5, unit: "hrs" },
];

function CostsPage() {
  const { id } = Route.useParams();
  const p = useProject(id)!;
  const setSettings = useProjects((s) => s.setSettings);
  const s = p.settings;
  const locations = useMemo(() => [...new Set(p.scenes.map((x) => x.location))].sort(), [p.scenes]);
  const cast = useMemo(() => [...new Set(p.scenes.flatMap((x) => x.cast))].sort(), [p.scenes]);
  const fmt = (f: (typeof fields)[number], v: number) => (f.unit === "$" ? money(v) : `${v} ${f.unit}`);

  return (
    <main className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[1fr_380px]">
      <section>
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-3xl font-bold uppercase">Cost weights</h2>
          <Button variant="ghost" size="sm" onClick={() => setSettings(id, { ...defaultSettings(), locationRates: s.locationRates, actorRates: s.actorRates })}>Reset</Button>
          <Button className="ml-auto" asChild><Link to="/project/$id/schedule" params={{ id }}>Open stripboard →</Link></Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.k} className="rounded border border-border bg-card p-4">
              <div className="flex items-baseline justify-between">
                <label className="font-display text-lg font-semibold uppercase">{f.label}</label>
                <span className="font-mono text-lg font-bold text-primary">{fmt(f, s[f.k])}</span>
              </div>
              <p className="mb-3 font-mono text-xs text-muted-foreground">{f.hint}</p>
              <div className="flex items-center gap-3">
                <Slider value={[s[f.k]]} max={f.max} step={f.step} min={0} onValueChange={([v]) => setSettings(id, { [f.k]: v ?? 0 })} />
                <Input type="number" className="h-8 w-24 font-mono" value={s[f.k]} onChange={(e) => setSettings(id, { [f.k]: Math.max(0, Number(e.target.value) || 0) })} />
              </div>
            </div>
          ))}
        </div>
      </section>
      <aside className="space-y-6">
        <RateList title="Per-location day rate" items={locations} rates={s.locationRates} fallback={s.locationDayRate}
          onChange={(r) => setSettings(id, { locationRates: r })} />
        <RateList title="Per-actor day rate" items={cast} rates={s.actorRates} fallback={s.actorDayRate}
          onChange={(r) => setSettings(id, { actorRates: r })} />
      </aside>
    </main>
  );
}

function RateList({ title, items, rates, fallback, onChange }: { title: string; items: string[]; rates: Record<string, number>; fallback: number; onChange: (r: Record<string, number>) => void }) {
  return (
    <div className="rounded border border-border bg-card">
      <h3 className="border-b border-border px-4 py-2 text-lg font-semibold uppercase">{title}</h3>
      {!items.length && <p className="p-4 font-mono text-sm text-muted-foreground">None yet.</p>}
      <ul className="max-h-80 divide-y divide-border overflow-auto">
        {items.map((it) => (
          <li key={it} className="flex items-center gap-2 px-4 py-1.5">
            <span className="flex-1 truncate font-mono text-sm">{it}</span>
            <Input type="number" className="h-7 w-24 font-mono text-sm" placeholder={String(fallback)} value={rates[it] ?? ""}
              onChange={(e) => { const n = { ...rates }; if (e.target.value === "") delete n[it]; else n[it] = Math.max(0, Number(e.target.value)); onChange(n); }} />
          </li>
        ))}
      </ul>
    </div>
  );
}
