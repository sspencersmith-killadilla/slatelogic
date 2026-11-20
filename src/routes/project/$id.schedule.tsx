import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { DndContext, DragOverlay, PointerSensor, KeyboardSensor, closestCorners, useSensor, useSensors, useDroppable, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, ArrowDown, ArrowUp, Download, Loader2, Lock, LockOpen, Plus, Trash2, Truck, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProjects } from "@/lib/store/projects";
import { useProject } from "@/lib/store/useReady";
import { evaluate } from "@/lib/cost/model";
import { runOptimizer } from "@/lib/cost/run";
import { fmtEighths, money, uid, type Project, type Scene, type ShootDay } from "@/lib/types";
import { StripBody } from "@/components/app/Strip";
import { download, doodCsv, scheduleCsv, slug } from "@/lib/export";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/project/$id/schedule")({ head: () => ({ meta: [
    { title: "Stripboard — SlateLogic" },
    { name: "description", content: "Arrange shoot days, optimize production costs and review cast Day-Out-of-Days." },
    { property: "og:title", content: "Stripboard — SlateLogic" },
    { property: "og:description", content: "Arrange shoot days, optimize production costs and review cast Day-Out-of-Days." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }), component: SchedulePage });

const UNSCHED = "unscheduled";

export function castIdMap(p: Project) {
  const m = new Map<string, number>();
  for (const s of p.scenes) for (const c of s.cast) if (!m.has(c)) m.set(c, m.size + 1);
  return m;
}

function SchedulePage() {
  const { id } = Route.useParams();
  const p = useProject(id)!;
  const setDays = useProjects((s) => s.setDays);
  const [iters, setIters] = useState(20000);
  const [busy, setBusy] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [delta, setDelta] = useState<number | null>(null);
  const sceneMap = useMemo(() => new Map(p.scenes.map((s) => [s.id, s])), [p.scenes]);
  const castIds = useMemo(() => castIdMap(p), [p]);
  const b = useMemo(() => evaluate(p.days, sceneMap, p.settings), [p.days, sceneMap, p.settings]);
  const prevTotal = useRef(b.total);
  const scheduled = new Set(p.days.flatMap((d) => d.sceneIds));
  const unscheduled = p.scenes.filter((s) => !scheduled.has(s.id)).map((s) => s.id);

  useEffect(() => {
    const d = b.total - prevTotal.current;
    prevTotal.current = b.total;
    if (d !== 0) { setDelta(d); const t = setTimeout(() => setDelta(null), 2500); return () => clearTimeout(t); }
    return undefined;
  }, [b.total]);

  const commit = (days: ShootDay[]) => setDays(id, days);
  const optimize = async () => {
    setBusy(true);
    try { commit(await runOptimizer(p.scenes, p.settings, p.days, iters)); toast.success("Schedule optimized"); }
    catch { toast.error("Optimizer failed"); } finally { setBusy(false); }
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const containerOf = (sid: string) => (sid.startsWith("c:") ? sid.slice(2) : p.days.find((d) => d.sceneIds.includes(sid))?.id ?? (unscheduled.includes(sid) ? UNSCHED : null));
  const moveScene = (sceneId: string, toDay: string, index?: number) => {
    const days = p.days.map((d) => ({ ...d, sceneIds: d.sceneIds.filter((x) => x !== sceneId) }));
    if (toDay !== UNSCHED) { const d = days.find((x) => x.id === toDay); if (d) d.sceneIds.splice(index ?? d.sceneIds.length, 0, sceneId); }
    commit(days);
  };
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const a = String(e.active.id), o = e.over ? String(e.over.id) : null;
    if (!o || a === o) return;
    const from = containerOf(a), to = containerOf(o);
    if (!from || !to) return;
    if (from === to && from !== UNSCHED) {
      commit(p.days.map((d) => d.id === from ? { ...d, sceneIds: arrayMove(d.sceneIds, d.sceneIds.indexOf(a), d.sceneIds.indexOf(o)) } : d));
      return;
    }
    const target = p.days.find((d) => d.id === to);
    const idx = target && !o.startsWith("c:") ? target.sceneIds.indexOf(o) : undefined;
    moveScene(a, to, idx);
  };
  const shift = (dayId: string, sid: string, dir: -1 | 1) => {
    commit(p.days.map((d) => { if (d.id !== dayId) return d; const i = d.sceneIds.indexOf(sid), j = i + dir; if (j < 0 || j >= d.sceneIds.length) return d; return { ...d, sceneIds: arrayMove(d.sceneIds, i, j) }; }));
  };
  const moveDay = (i: number, dir: -1 | 1) => { const j = i + dir; if (j < 0 || j >= p.days.length) return; commit(arrayMove(p.days, i, j)); };

  const warnings = b.actors.filter((a) => a.warnings.length);
  const moves = b.days.reduce((a, d) => a + d.moves, 0);
  const active = activeId ? sceneMap.get(activeId) : null;

  if (!p.scenes.length) return <main className="p-10 font-mono text-muted-foreground">Add scenes on the Script tab first.</main>;

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <section className="mb-6 grid gap-3 md:grid-cols-[1fr_auto]">
        <div className="flex flex-wrap items-end gap-6 rounded border border-border bg-card p-4">
          <Stat label="Est. total" value={money(b.total)} big extra={delta !== null && (
            <span className={cn("ml-2 font-mono text-sm", delta > 0 ? "text-destructive" : "text-success")}>{delta > 0 ? "+" : "−"}{money(Math.abs(delta))}</span>)} />
          <Stat label="Shoot days" value={String(p.days.length)} />
          <Stat label="Company moves" value={String(moves)} />
          <Stat label="Cast warnings" value={String(warnings.length)} />
          <Stat label="Unscheduled" value={String(unscheduled.length)} />
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded border border-border bg-card p-4">
          <label className="font-mono text-xs text-muted-foreground">Iterations
            <Input type="number" min={500} step={1000} value={iters} onChange={(e) => setIters(Math.max(500, Number(e.target.value) || 500))} className="h-9 w-28 font-mono" />
          </label>
          <Button onClick={optimize} disabled={busy} className="self-end">{busy ? <Loader2 className="animate-spin" /> : <Wand2 />} {p.days.some((d) => d.locked) ? "Re-optimize (keep locked)" : "Optimize"}</Button>
          <div className="flex w-full gap-1">
            <Button size="sm" variant="outline" onClick={() => download(`${slug(p.name)}-schedule.csv`, scheduleCsv(p), "text/csv")}><Download /> Schedule CSV</Button>
            <Button size="sm" variant="outline" onClick={() => download(`${slug(p.name)}-dood.csv`, doodCsv(p), "text/csv")}><Download /> DOOD CSV</Button>
            <Button size="sm" variant="outline" onClick={() => download(`${slug(p.name)}.json`, JSON.stringify(p, null, 2), "application/json")}><Download /> JSON</Button>
          </div>
        </div>
      </section>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {p.days.map((d, i) => {
              const dc = b.days[i]!;
              return (
                <div key={d.id} className={cn("overflow-hidden rounded border-2 bg-card", dc.overLimit ? "border-destructive" : "border-border")}>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-day-break px-3 py-2 text-day-break-foreground">
                    <span className="font-display text-xl font-bold uppercase">Day {i + 1}</span>
                    <span className="font-mono text-xs">{fmtEighths(dc.eighths)} pgs · {dc.hours.toFixed(1)} h</span>
                    <span className="font-mono text-xs">{dc.locations.length} loc</span>
                    {dc.moves > 0 && <span className="flex items-center gap-1 font-mono text-xs"><Truck className="size-3.5" />{dc.moves} move{dc.moves > 1 ? "s" : ""}</span>}
                    {dc.turnaround > 0 && <span className="flex items-center gap-1 font-mono text-xs"><AlertTriangle className="size-3.5" />turnaround</span>}
                    {dc.overLimit && <span className="flex items-center gap-1 font-mono text-xs font-bold"><AlertTriangle className="size-3.5" />over limit</span>}
                    <span className="ml-auto font-mono text-sm font-bold">{money(dc.total)}</span>
                    <div className="flex">
                      <IconBtn label="Move day up" onClick={() => moveDay(i, -1)}><ArrowUp /></IconBtn>
                      <IconBtn label="Move day down" onClick={() => moveDay(i, 1)}><ArrowDown /></IconBtn>
                      <IconBtn label={d.locked ? "Unlock day" : "Lock day"} onClick={() => commit(p.days.map((x) => x.id === d.id ? { ...x, locked: !x.locked } : x))}>{d.locked ? <Lock /> : <LockOpen />}</IconBtn>
                      <IconBtn label="Remove day" onClick={() => commit(p.days.filter((x) => x.id !== d.id))}><Trash2 /></IconBtn>
                    </div>
                  </div>
                  <Column id={d.id} ids={d.sceneIds} sceneMap={sceneMap} castIds={castIds} days={p.days} onMove={moveScene} onShift={(sid, dir) => shift(d.id, sid, dir)} />
                </div>
              );
            })}
            <Button variant="outline" onClick={() => commit([...p.days, { id: uid(), sceneIds: [], locked: false }])}><Plus /> Add shoot day</Button>
          </div>
          <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            <div className="overflow-hidden rounded border-2 border-dashed border-border bg-card">
              <div className="bg-secondary px-3 py-2 font-display text-lg font-bold uppercase">Unscheduled ({unscheduled.length})</div>
              <Column id={UNSCHED} ids={unscheduled} sceneMap={sceneMap} castIds={castIds} days={p.days} onMove={moveScene} />
            </div>
            <Legend castIds={castIds} />
          </aside>
        </div>
        <DragOverlay>{active ? <div className="shadow-lg"><StripBody s={active} castIds={castIds} /></div> : null}</DragOverlay>
      </DndContext>

      <Dood p={p} b={b} castIds={castIds} />
    </main>
  );
}

function Stat({ label, value, big, extra }: { label: string; value: string; big?: boolean; extra?: React.ReactNode }) {
  return <div><div className="font-mono text-xs uppercase text-muted-foreground">{label}</div><div className={cn("font-display font-bold", big ? "text-4xl text-primary" : "text-2xl")}>{value}{extra}</div></div>;
}
function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return <button aria-label={label} title={label} onClick={onClick} className="rounded p-1 opacity-80 hover:opacity-100 [&_svg]:size-4">{children}</button>;
}

function Column({ id, ids, sceneMap, castIds, days, onMove, onShift }: { id: string; ids: string[]; sceneMap: Map<string, Scene>; castIds: Map<string, number>; days: ShootDay[]; onMove: (sid: string, day: string) => void; onShift?: ((sid: string, dir: -1 | 1) => void) | undefined }) {
  const { setNodeRef, isOver } = useDroppable({ id: "c:" + id });
  return (
    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
      <div ref={setNodeRef} className={cn("min-h-12", isOver && "bg-accent")}>
        {ids.map((sid) => { const s = sceneMap.get(sid); return s ? <SortableStrip key={sid} s={s} castIds={castIds} days={days} currentDay={id} onMove={onMove} onShift={onShift} /> : null; })}
        {!ids.length && <div className="p-3 text-center font-mono text-xs text-muted-foreground">Drop strips here</div>}
      </div>
    </SortableContext>
  );
}

function SortableStrip({ s, castIds, days, currentDay, onMove, onShift }: { s: Scene; castIds: Map<string, number>; days: ShootDay[]; currentDay: string; onMove: (sid: string, day: string) => void; onShift?: ((sid: string, dir: -1 | 1) => void) | undefined }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: s.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn("group relative", isDragging && "opacity-30")}>
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing"><StripBody s={s} castIds={castIds} /></div>
      <div className="absolute right-1 top-1 hidden items-center gap-1 rounded bg-card/90 p-0.5 group-hover:flex group-focus-within:flex">
        {onShift && <><IconBtn label="Move up" onClick={() => onShift(s.id, -1)}><ArrowUp /></IconBtn><IconBtn label="Move down" onClick={() => onShift(s.id, 1)}><ArrowDown /></IconBtn></>}
        <select aria-label="Move to day" value={currentDay} onChange={(e) => onMove(s.id, e.target.value)} className="h-6 rounded border border-border bg-card font-mono text-xs">
          {days.map((d, i) => <option key={d.id} value={d.id}>Day {i + 1}</option>)}
          <option value={UNSCHED}>Unscheduled</option>
        </select>
      </div>
    </div>
  );
}

function Legend({ castIds }: { castIds: Map<string, number> }) {
  return (
    <div className="rounded border border-border bg-card p-3 font-mono text-xs">
      <div className="mb-2 font-display text-base font-bold uppercase">Strip key</div>
      <div className="mb-3 grid grid-cols-2 gap-1 text-strip-ink">
        <span className="bg-strip-int-day px-2 py-1 ring-1 ring-border">INT DAY</span><span className="bg-strip-ext-day px-2 py-1">EXT DAY</span>
        <span className="bg-strip-int-night px-2 py-1">INT NIGHT</span><span className="bg-strip-ext-night px-2 py-1">EXT NIGHT</span>
      </div>
      <div className="mb-1 font-display text-base font-bold uppercase">Cast IDs</div>
      <ul className="columns-2">{[...castIds].map(([n, i]) => <li key={n}>{i}. {n}</li>)}</ul>
    </div>
  );
}

function Dood({ p, b, castIds }: { p: Project; b: ReturnType<typeof evaluate>; castIds: Map<string, number> }) {
  if (!b.actors.length) return null;
  const rows = [...b.actors].sort((x, y) => (castIds.get(x.actor) ?? 0) - (castIds.get(y.actor) ?? 0));
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-3xl font-bold uppercase">Day out of days</h2>
      <div className="overflow-x-auto rounded border border-border bg-card">
        <table className="w-full font-mono text-xs">
          <thead className="bg-secondary"><tr>
            <th className="p-2 text-left">Cast</th>{p.days.map((_, i) => <th key={i} className="w-10 p-2">{i + 1}</th>)}
            <th className="p-2">W</th><th className="p-2">H</th><th className="p-2 text-right">Cost</th><th className="p-2 text-left">Warnings</th>
          </tr></thead>
          <tbody>{rows.map((a) => (
            <tr key={a.actor} className="border-t border-border">
              <td className="whitespace-nowrap p-2 font-bold">{castIds.get(a.actor)}. {a.actor}</td>
              {a.codes.map((c, i) => <td key={i} className={cn("p-2 text-center", c === "H" ? "bg-destructive/15 text-destructive" : c ? "bg-accent font-bold" : "")}>{c}</td>)}
              <td className="p-2 text-center">{a.work}</td><td className="p-2 text-center">{a.hold}</td>
              <td className="p-2 text-right">{money(a.cost)}</td>
              <td className="p-2 text-destructive">{a.warnings.map((w) => <div key={w} className="flex items-center gap-1"><AlertTriangle className="size-3" />{w}</div>)}</td>
            </tr>))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
