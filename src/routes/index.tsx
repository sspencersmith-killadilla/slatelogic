import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Film, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProjects } from "@/lib/store/projects";
import { useStoreReady } from "@/lib/store/useReady";
import type { Project } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SlateLogic — Script to cost-optimized stripboard" },
      { name: "description", content: "Upload a screenplay, break it into scenes and build a shooting schedule that minimizes location, move and cast costs." },
      { property: "og:title", content: "SlateLogic — Script to cost-optimized stripboard" },
      { property: "og:description", content: "Break down your script and generate a cost-minimizing shooting schedule." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const ready = useStoreReady();
  const { projects, create, remove, importProject, loadDemo } = useProjects();
  const [name, setName] = useState("");
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const start = () => {
    const id = create(name.trim() || "Untitled Production");
    void nav({ to: "/project/$id/script", params: { id } });
  };
  const onImport = async (f: File) => {
    try {
      const p = JSON.parse(await f.text()) as Project;
      if (!Array.isArray(p.scenes)) throw new Error();
      const id = importProject(p);
      void nav({ to: "/project/$id/schedule", params: { id } });
    } catch { toast.error("That file isn't a SlateLogic project export."); }
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-14">
      <header className="mb-12 border-b-4 border-double border-foreground pb-8">
        <img src="/favicon.png" alt="" width={48} height={48} className="mb-3" />
        <h1 className="text-5xl font-bold uppercase leading-none md:text-8xl">SlateLogic</h1>
        <p className="mt-4 max-w-2xl font-mono text-base text-muted-foreground">
          Drop in a screenplay. Get scene breakdowns, a stripboard and a shooting order that keeps location, move and cast costs down.
        </p>
      </header>

      <section className="mb-10 flex flex-col gap-3 sm:flex-row">
        <Input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && start()}
          placeholder="Production title, e.g. Last Light at the Diner" className="h-12 font-mono" />
        <Button size="lg" className="h-12" onClick={start}><Plus /> New production</Button>
        <Button size="lg" variant="outline" className="h-12" onClick={() => fileRef.current?.click()}><Upload /> Import JSON</Button>
        <Button size="lg" variant="ghost" className="h-12" onClick={() => { loadDemo(); toast.success("Example production loaded"); }}>Load example screenplay</Button>
        <input ref={fileRef} type="file" accept=".json" hidden onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
      </section>

      <h2 className="mb-3 text-2xl font-semibold uppercase">Productions</h2>
      {!ready ? null : projects.length === 0 ? (
        <div className="rounded border border-dashed border-border p-10 text-center font-mono text-muted-foreground">
          <Film className="mx-auto mb-3" /> No productions yet. Create one above to upload a script.
        </div>
      ) : (
        <ul className="divide-y divide-border rounded border border-border bg-card">
          {projects.map((p) => (
            <li key={p.id} className="flex items-center gap-4 px-4 py-3">
              <Link to="/project/$id/schedule" params={{ id: p.id }} className="flex-1">
                <div className="font-display text-xl font-semibold uppercase">{p.name}</div>
                <div className="font-mono text-xs text-muted-foreground">{p.scenes.length} scenes · {p.days.length} shoot days</div>
              </Link>
              <Button variant="ghost" size="icon" aria-label="Delete production" onClick={() => confirm(`Delete ${p.name}?`) && remove(p.id)}><Trash2 /></Button>
            </li>
          ))}
        </ul>
      )}
      <footer className="mt-10 border-t border-border pt-4 font-mono text-xs text-muted-foreground">
        <a href="/license.txt" className="underline">MIT license · © 2026 Spencer Smith</a>
        <span className="mx-2">·</span>
        <a href="https://commons.wikimedia.org/wiki/File:The_Last_Screenwriter_-_Screenplay.pdf" target="_blank" rel="noreferrer" className="underline">Example: “The Last Screenwriter” screenplay · public domain</a>
      </footer>
    </main>
  );
}
