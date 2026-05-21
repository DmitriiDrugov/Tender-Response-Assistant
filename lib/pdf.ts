/**
 * pdf-parse has a top-level test that reads a local file when the module is required
 * with no callsite — Next.js' bundler will execute that path and crash.
 * Always import the internal entry directly, and never at module scope outside this file.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  type PdfParse = (data: Buffer) => Promise<{ text: string }>;
  const mod = (await import("pdf-parse/lib/pdf-parse.js")) as unknown as
    | { default: PdfParse }
    | PdfParse;
  const pdfParse: PdfParse = (mod as { default?: PdfParse }).default ?? (mod as PdfParse);
  const result = await pdfParse(buffer);
  return result.text;
}
