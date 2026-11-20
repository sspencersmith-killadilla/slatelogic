import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useProjects } from "@/lib/store/projects";
import { useProject } from "@/lib/store/useReady";
import { type Frame, type Scene, uid } from "@/lib/types";
import { type BoardStyle, SHOTS, STYLE_LABELS, canGenerate, framePrompt } from "@/lib/storyboard/prompt";
import { ImageHttpError, streamImage } from "@/lib/storyboard/stream-image";
import { deleteImage, loadImage, saveImage } from "@/lib/storyboard/imageStore";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/project/$id/storyboard")({
  head: () => ({ meta: [
    { title: "AI Storyboard — SlateLogic" },
    { name: "description", content: "Optional AI-sketched storyboard frames for every scene in your production." },
    { property: "og:title", content: "AI Storyboard — SlateLogic" },
    { property: "og:description", content: "Sketch storyboard frames for each scene with AI." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: StoryboardPage,
});

function StoryboardPage() {
  const { id } = Route.useParams();
  const p = useProject(id)!;
  const update = useProjects((s) => s.update);
  const style: BoardStyle = p.storyboardStyle ?? "pencil";
  const [count, setCount] = useState(2);
  const [busy, setBusy] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const stopRef = useRef<AbortController | null>(null);
  const [batch, setBatch] = useState<{ done: number; total: number } | null>(null);
  const enabled = canGenerate(p);

  const setFrames = (sceneId: string, fn: (f: Frame[]) => Frame[]) =>
    update(id, (pp) => ({ scenes: pp.scenes.map((s) => (s.id === sceneId ? { ...s, frames: fn(s.frames ?? []) } : s)) }));

  async function makeFrame(scene: Scene, shot: string, note: string, replace?: Frame, signal?: AbortSignal) {
    if (!canGenerate(useProjects.getState().projects.find((x) => x.id === id) ?? {})) return;
    const key = `${id}:${scene.id}:${uid()}`;
    const slot = replace?.id ?? key;
    setBusy((b) => ({ ...b, [slot]: "" }));
    try {
      let last = "";
      await streamImage("/api/storyboard-frame", { prompt: framePrompt(scene, shot, style, note) }, (url) => {
        last = url; setBusy((b) => ({ ...b, [slot]: url }));
      }, signal);
      await saveImage(key, last);
      if (replace) {
        await deleteImage(replace.imageKey);
        setFrames(scene.id, (fs) => fs.map((f) => (f.id === replace.id ? { ...f, imageKey: key, createdAt: Date.now() } : f)));
      } else setFrames(scene.id, (fs) => [...fs, { id: uid(), shot, note, imageKey: key, createdAt: Date.now() }]);
    } catch (e) {
      if (signal?.aborted) throw e;
      if (e instanceof ImageHttpError && (e.status === 402 || e.status === 403)) setPaused(true);
      setError(e instanceof Error ? e.message : "Image generation failed");
      throw e;
    } finally {
      setBusy((b) => { const n = { ...b }; delete n[slot]; return n; });
    }
  }

  const generateScene = async (scene: Scene, signal?: AbortSignal) => {
    setError(null);
    const have = scene.frames?.length ?? 0;
    for (let i = have; i < have + count; i++) await makeFrame(scene, SHOTS[i % SHOTS.length]!, "", undefined, signal);
  };

  async function generateAll() {
    const todo = p.scenes.filter((s) => !s.frames?.length);
    const ac = new AbortController(); stopRef.current = ac;
    setBatch({ done: 0, total: todo.length }); setError(null);
    try {
      for (const [i, s] of todo.entries()) {
        if (ac.signal.aborted) break;
        await generateScene(s, ac.signal);
        setBatch({ done: i + 1, total: todo.length });
      }
    } catch { /* message already shown, stop the batch */ }
    finally { setBatch(null); stopRef.current = null; }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <section className="flex flex-wrap items-center gap-4 border border-border bg-card p-4 print:hidden">
        <label className="flex items-center gap-3 font-display text-lg font-semibold uppercase">
          <Switch checked={enabled} onCheckedChange={(v) => update(id, () => ({ storyboardEnabled: v }))} />
          Use AI storyboarding
        </label>
        {enabled && <>
          <select className="h-9 border border-input bg-background px-2 font-mono text-sm" value={style}
            onChange={(e) => update(id, () => ({ storyboardStyle: e.target.value as BoardStyle }))}>
            {Object.entries(STYLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className="h-9 border border-input bg-background px-2 font-mono text-sm" value={count} onChange={(e) => setCount(+e.target.value)}>
            {[1, 2, 3].map((n) => <option key={n} value={n}>{n} frame{n > 1 ? "s" : ""} per scene</option>)}
          </select>
          <div className="ml-auto flex gap-2">
            {batch ? <Button variant="outline" onClick={() => stopRef.current?.abort()}>Stop ({batch.done}/{batch.total})</Button>
              : <Button disabled={paused} onClick={generateAll}>Generate all missing</Button>}
            <Button variant="outline" onClick={() => window.print()}>Print storyboard</Button>
          </div>
        </>}
      </section>
      {!enabled && <p className="font-mono text-sm text-muted-foreground">Storyboarding is off. Turn it on to sketch frames for each scene with AI — nothing is sent to AI until you do. Each frame uses AI credits.</p>}
      {error && <p role="alert" className="border border-destructive p-3 font-mono text-sm text-destructive">{error}{paused && <> — generation is paused. <button className="underline" onClick={() => { setPaused(false); setError(null); }}>Resume</button></>}</p>}
      {enabled && (
        <div className="grid gap-6">
          {p.scenes.map((s) => (
            <article key={s.id} className="break-inside-avoid border border-border bg-card p-4">
              <header className="mb-3 flex flex-wrap items-baseline gap-3">
                <span className="font-display text-xl font-bold">{s.number}</span>
                <span className="font-mono text-sm font-bold">{s.intExt}. {s.location} — {s.time}</span>
                <span className="font-mono text-xs text-muted-foreground">{s.cast.join(", ")}</span>
                <Button size="sm" className="ml-auto print:hidden" disabled={paused || !!batch} onClick={() => generateScene(s).catch(() => {})}>Generate frames</Button>
              </header>
              <p className="mb-3 font-mono text-xs text-muted-foreground">{s.synopsis}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(s.frames ?? []).map((f, i) => (
                  <FrameCard key={f.id} f={f} n={i + 1} preview={busy[f.id]}
                    onNote={(note) => setFrames(s.id, (fs) => fs.map((x) => (x.id === f.id ? { ...x, note } : x)))}
                    onShot={(shot) => setFrames(s.id, (fs) => fs.map((x) => (x.id === f.id ? { ...x, shot } : x)))}
                    onRegen={() => { setError(null); makeFrame(s, f.shot, f.note, f).catch(() => {}); }}
                    onDelete={() => { void deleteImage(f.imageKey); setFrames(s.id, (fs) => fs.filter((x) => x.id !== f.id)); }} />
                ))}
                {Object.entries(busy).filter(([k]) => k.startsWith(`${id}:${s.id}:`)).map(([k, url]) => (
                  <div key={k} className="aspect-[3/2] overflow-hidden border border-border bg-muted">
                    {url ? <img src={url} alt="Frame in progress" className="h-full w-full object-cover blur-md" />
                      : <div className="flex h-full items-center justify-center font-mono text-xs text-muted-foreground">Sketching…</div>}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

function FrameCard({ f, n, preview, onNote, onShot, onRegen, onDelete }: {
  f: Frame; n: number; preview?: string | undefined; onNote: (v: string) => void; onShot: (v: string) => void; onRegen: () => void; onDelete: () => void;
}) {
  const [src, setSrc] = useState<string>();
  useEffect(() => { let live = true; loadImage(f.imageKey).then((u) => live && setSrc(u)); return () => { live = false; }; }, [f.imageKey]);
  const shown = preview || src;
  return (
    <figure className="border border-border">
      <div className="aspect-[3/2] bg-muted">
        {shown ? <img src={shown} alt={`Frame ${n}: ${f.shot}`} className={cn("h-full w-full object-cover", preview !== undefined && "blur-md")} />
          : <div className="flex h-full items-center justify-center font-mono text-xs text-muted-foreground">{preview === "" ? "Sketching…" : "Image not in this browser"}</div>}
      </div>
      <figcaption className="space-y-2 p-2 font-mono text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold">#{n}</span>
          <select aria-label="Shot type" value={f.shot} onChange={(e) => onShot(e.target.value)} className="border border-input bg-background px-1 print:appearance-none print:border-0">
            {[...SHOTS, ...(SHOTS.includes(f.shot as never) ? [] : [f.shot])].map((s) => <option key={s}>{s}</option>)}
          </select>
          <button className="ml-auto underline print:hidden" disabled={preview !== undefined} onClick={onRegen}>Redo</button>
          <button className="underline print:hidden" onClick={onDelete}>Delete</button>
        </div>
        <Input aria-label="Shot note" placeholder="Shot note, e.g. WIDE – hero enters" value={f.note} onChange={(e) => onNote(e.target.value)} className="h-8 text-xs" />
      </figcaption>
    </figure>
  );
}
