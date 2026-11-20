import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { FileText, Loader2, Merge, Plus, Scissors, Trash2, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProjects } from "@/lib/store/projects";
import { useProject } from "@/lib/store/useReady";
import { extractText } from "@/lib/parser/extract";
import { parseScript } from "@/lib/parser/scenes";
import { SAMPLE_SCRIPT } from "@/lib/sample";
import { fmtEighths, uid, type Scene } from "@/lib/types";
import { greedy } from "@/lib/cost/optimize";

export const Route = createFileRoute("/project/$id/script")({ component: ScriptPage });

const cell = "h-8 border-transparent bg-transparent px-1 font-mono text-sm shadow-none focus-visible:border-input focus-visible:bg-background";

function ScriptPage() {
  const { id } = Route.useParams();
  const p = useProject(id)!;
  const { setScenes, setDays } = useProjects();
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const nav = useNavigate();

  const load = (text: string) => {
    const scenes = parseScript(text);
    if (!scenes.length) { toast.error("No scene headings found (looking for lines like “INT. KITCHEN - DAY”)."); return; }
    setScenes(id, scenes); setDays(id, []); setSel(new Set());
    toast.success(`Found ${scenes.length} scenes`);
  };
  const onFile = async (f: File) => {
    setBusy(true);
    try { load(await extractText(f)); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const upd = (sid: string, patch: Partial<Scene>) => setScenes(id, p.scenes.map((s) => (s.id === sid ? { ...s, ...patch } : s)));
  const del = (ids: string[]) => {
    setScenes(id, p.scenes.filter((s) => !ids.includes(s.id)));
    setDays(id, p.days.map((d) => ({ ...d, sceneIds: d.sceneIds.filter((x) => !ids.includes(x)) })));
    setSel(new Set());
  };
  const merge = () => {
    const ss = p.scenes.filter((s) => sel.has(s.id)); if (ss.length < 2) return;
    const m: Scene = { ...ss[0]!, eighths: ss.reduce((a, b) => a + b.eighths, 0), hours: ss.reduce((a, b) => a + b.hours, 0), cast: [...new Set(ss.flatMap((s) => s.cast))] };
    const rest = ss.slice(1).map((s) => s.id);
    setScenes(id, p.scenes.filter((s) => !rest.includes(s.id)).map((s) => (s.id === m.id ? m : s)));
    setDays(id, p.days.map((d) => ({ ...d, sceneIds: d.sceneIds.filter((x) => !rest.includes(x)) }))); setSel(new Set());
  };
  const split = (s: Scene) => {
    const half = Math.max(1, Math.floor(s.eighths / 2));
    const b: Scene = { ...s, id: uid(), number: s.number + "A", eighths: Math.max(1, s.eighths - half), hours: s.hours / 2 };
    const i = p.scenes.findIndex((x) => x.id === s.id);
    const next = [...p.scenes]; next.splice(i, 1, { ...s, eighths: half, hours: s.hours / 2 }, b); setScenes(id, next);
  };
  const add = () => setScenes(id, [...p.scenes, { id: uid(), number: String(p.scenes.length + 1), intExt: "INT", time: "DAY", location: "NEW LOCATION", synopsis: "", eighths: 8, hours: 1.5, cast: [] }]);

  const rows = useMemo(() => {
    const t = q.toLowerCase();
    return p.scenes.filter((s) => !t || [s.number, s.location, s.synopsis, ...s.cast].join(" ").toLowerCase().includes(t));
  }, [p.scenes, q]);
  const totals = { e: p.scenes.reduce((a, b) => a + b.eighths, 0), locs: new Set(p.scenes.map((s) => s.location)).size, cast: new Set(p.scenes.flatMap((s) => s.cast)).size };

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <section className="mb-6 flex flex-wrap items-center gap-3 rounded border-2 border-dashed border-border bg-card p-5"
        onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) void onFile(f); }}>
        <FileText className="text-muted-foreground" />
        <div className="flex-1 font-mono text-sm">
          <div className="font-bold">Upload a script (PDF or DOCX)</div>
          <div className="text-muted-foreground">Drag it here or choose a file. Re-uploading replaces the scene list.</div>
        </div>
        <Button onClick={() => fileRef.current?.click()} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <FileText />} Choose file</Button>
        <Button variant="outline" onClick={() => load(SAMPLE_SCRIPT)}>Use sample script</Button>
        <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt,.fountain" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.target.value = ""; }} />
      </section>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="mr-4 text-3xl font-bold uppercase">Breakdown</h2>
        <span className="font-mono text-sm text-muted-foreground">{p.scenes.length} scenes · {fmtEighths(totals.e)} pgs · {totals.locs} locations · {totals.cast} cast</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="h-9 w-48 font-mono" />
          <Button variant="outline" size="sm" onClick={add}><Plus /> Scene</Button>
          <Button variant="outline" size="sm" disabled={sel.size < 2} onClick={merge}><Merge /> Merge</Button>
          <Button variant="outline" size="sm" disabled={!sel.size} onClick={() => del([...sel])}><Trash2 /> Delete</Button>
          <Button size="sm" disabled={!p.scenes.length} onClick={() => { if (!p.days.length) setDays(id, greedy(p.scenes, p.settings)); void nav({ to: "/project/$id/costs", params: { id } }); }}><Wand2 /> Next: costs</Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded border border-border bg-card">
        <table className="w-full min-w-[1000px] text-left">
          <thead className="bg-secondary font-display text-sm uppercase">
            <tr>
              <th className="w-8 p-2" />
              <th className="w-16 p-2">Sc.</th><th className="w-28 p-2">I/E</th><th className="w-28 p-2">Time</th>
              <th className="p-2">Location</th><th className="p-2">Synopsis</th><th className="w-64 p-2">Cast</th>
              <th className="w-20 p-2">8ths</th><th className="w-20 p-2">Hrs</th><th className="w-16 p-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-t border-border align-top">
                <td className="p-2"><input type="checkbox" aria-label={`Select scene ${s.number}`} checked={sel.has(s.id)} onChange={(e) => { const n = new Set(sel); e.target.checked ? n.add(s.id) : n.delete(s.id); setSel(n); }} /></td>
                <td className="p-1"><Input className={cell} value={s.number} onChange={(e) => upd(s.id, { number: e.target.value })} /></td>
                <td className="p-1"><select className={cell + " w-full rounded"} value={s.intExt} onChange={(e) => upd(s.id, { intExt: e.target.value as Scene["intExt"] })}><option>INT</option><option>EXT</option><option>INT/EXT</option></select></td>
                <td className="p-1"><select className={cell + " w-full rounded"} value={s.time} onChange={(e) => upd(s.id, { time: e.target.value as Scene["time"] })}><option>DAY</option><option>NIGHT</option></select></td>
                <td className="p-1"><Input className={cell} value={s.location} onChange={(e) => upd(s.id, { location: e.target.value.toUpperCase() })} /></td>
                <td className="p-1"><Input className={cell} value={s.synopsis} onChange={(e) => upd(s.id, { synopsis: e.target.value })} /></td>
                <td className="p-1"><CastEditor cast={s.cast} onChange={(cast) => upd(s.id, { cast })} /></td>
                <td className="p-1"><Input className={cell} type="number" min={1} value={s.eighths} onChange={(e) => upd(s.id, { eighths: Math.max(1, Number(e.target.value) || 1) })} /></td>
                <td className="p-1"><Input className={cell} type="number" min={0} step={0.25} value={s.hours} onChange={(e) => upd(s.id, { hours: Math.max(0, Number(e.target.value) || 0) })} /></td>
                <td className="p-1"><Button variant="ghost" size="icon" title="Split scene" aria-label="Split scene" onClick={() => split(s)}><Scissors /></Button></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={10} className="p-10 text-center font-mono text-muted-foreground">No scenes yet — upload a script or use the sample.</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function CastEditor({ cast, onChange }: { cast: string[]; onChange: (c: string[]) => void }) {
  const [v, setV] = useState("");
  const commit = () => { const n = v.trim().toUpperCase(); if (n && !cast.includes(n)) onChange([...cast, n]); setV(""); };
  return (
    <div className="flex flex-wrap items-center gap-1 py-1">
      {cast.map((c) => (
        <span key={c} className="inline-flex items-center gap-1 rounded bg-accent px-1.5 py-0.5 font-mono text-xs">
          {c}<button aria-label={`Remove ${c}`} onClick={() => onChange(cast.filter((x) => x !== c))}><X className="size-3" /></button>
        </span>
      ))}
      <input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); } }} onBlur={commit}
        placeholder="+ add" className="w-16 bg-transparent font-mono text-xs outline-none" />
    </div>
  );
}
