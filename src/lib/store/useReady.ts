import { useEffect, useState } from "react";
import { useProjects } from "./projects";
export function useStoreReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const finish = () => { useProjects.getState().seedDemo(); setReady(true); };
    if (useProjects.persist.hasHydrated()) { finish(); return; }
    const off = useProjects.persist.onFinishHydration(finish);
    void useProjects.persist.rehydrate();
    return off;
  }, []);
  return ready;
}
export function useProject(id: string) {
  return useProjects((s) => s.projects.find((p) => p.id === id));
}
