import { useEffect, useState } from "react";
import { useProjects } from "./projects";
export function useStoreReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (useProjects.persist.hasHydrated()) { setReady(true); return; }
    const off = useProjects.persist.onFinishHydration(() => setReady(true));
    void useProjects.persist.rehydrate();
    return off;
  }, []);
  return ready;
}
export function useProject(id: string) {
  return useProjects((s) => s.projects.find((p) => p.id === id));
}
