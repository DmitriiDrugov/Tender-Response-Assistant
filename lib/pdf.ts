/**
 * pdf-parse has a top-level test that reads a local file when the module is required
 * with no callsite — Next.js' bundler will execute that path and crash.
 * Always import the internal entry directly, and never at module scope outside this file.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const { default: pdfParse } = await import("pdf-parse/lib/pdf-parse.js");
  const result = await pdfParse(buffer);
  return result.text;
}
