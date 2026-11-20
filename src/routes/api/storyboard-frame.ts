import { createFileRoute } from "@tanstack/react-router";
import { generateImage, imageSettings } from "@/lib/image-gateway.server";

export const Route = createFileRoute("/api/storyboard-frame")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as { prompt?: unknown; stream?: unknown } | null;
        const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
        if (!prompt || prompt.length > 4000) return Response.json({ error: "Invalid prompt" }, { status: 400 });
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return Response.json({ error: "AI is not configured" }, { status: 500 });
        const upstream = await generateImage({ ...imageSettings, apiKey }, prompt, body?.stream !== false);
        return new Response(upstream.body, {
          status: upstream.status,
          headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json", "Cache-Control": "no-cache" },
        });
      },
    },
  },
});
