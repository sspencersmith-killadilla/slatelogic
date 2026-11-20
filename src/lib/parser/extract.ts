export async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist");
    const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const out: string[] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const rows = new Map<number, { x: number; s: string }[]>();
      for (const it of content.items as { str: string; transform: number[] }[]) {
        if (!("str" in it)) continue;
        const y = Math.round(it.transform[5]! / 2) * 2;
        if (!rows.has(y)) rows.set(y, []);
        rows.get(y)!.push({ x: it.transform[4]!, s: it.str });
      }
      [...rows.entries()].sort((a, b) => b[0] - a[0]).forEach(([, r]) => {
        out.push(r.sort((a, b) => a.x - b.x).map((i) => i.s).join(" ").replace(/\s+/g, " "));
      });
    }
    return out.join("\n");
  }
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const r = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return r.value;
  }
  if (name.endsWith(".doc")) throw new Error("Old .doc files can't be read. Please save the script as DOCX or PDF and upload again.");
  if (name.endsWith(".txt") || name.endsWith(".fountain")) return file.text();
  throw new Error("Unsupported file type. Upload a PDF or DOCX.");
}
