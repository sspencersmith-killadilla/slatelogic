import { optimize } from "./optimize";
self.onmessage = (e: MessageEvent) => {
  const { scenes, settings, days, iterations } = e.data;
  (self as unknown as Worker).postMessage(optimize(scenes, settings, days, iterations));
};
