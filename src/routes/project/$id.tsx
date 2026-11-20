import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useStoreReady, useProject } from "@/lib/store/useReady";

export const Route = createFileRoute("/project/$id")({
  head: () => ({ meta: [
    { title: "Production — SlateLogic" },
    { name: "description", content: "Scene breakdown, cost settings and stripboard for this production." },
    { property: "og:title", content: "Production — SlateLogic" },
    { property: "og:description", content: "Scene breakdown, cost settings and stripboard." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Layout,
});

const tabs = [
  { to: "/project/$id/script", label: "1 · Script & Scenes" },
  { to: "/project/$id/costs", label: "2 · Cost Weights" },
  { to: "/project/$id/schedule", label: "3 · Stripboard" },
  { to: "/project/$id/print", label: "4 · Print" },
] as const;

function Layout() {
  const { id } = Route.useParams();
  const ready = useStoreReady();
  const p = useProject(id);
  if (!ready) return null;
  if (!p) return <div className="p-10 font-mono">Production not found. <Link to="/" className="underline">Back</Link></div>;
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card print:hidden">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end gap-x-8 gap-y-2 px-6 pt-4">
          <Link to="/" className="pb-3 font-display text-2xl font-bold uppercase">SlateLogic</Link>
          <div className="pb-3 font-mono text-sm text-muted-foreground">{p.name}</div>
          <nav className="ml-auto flex max-w-full flex-wrap gap-1">
            {tabs.map((t) => (
              <Link key={t.to} to={t.to} params={{ id }}
                className="border-b-2 border-transparent px-3 pb-3 font-display text-base font-semibold uppercase text-muted-foreground"
                activeProps={{ className: "border-primary! text-foreground!" }}>{t.label}</Link>
            ))}
          </nav>
        </div>
      </header>
      {p.sourceNotice && <p className="mx-auto max-w-7xl px-6 pt-4 font-mono text-xs text-muted-foreground">
        {p.sourceNotice} <a href="https://durian.blender.org/wp-content/uploads/2009/11/1stminute_script_11-61.pdf" target="_blank" rel="noreferrer" className="underline">Original screenplay</a> · <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer" className="underline">CC BY 3.0</a>
      </p>}
      <Outlet />
    </div>
  );
}
