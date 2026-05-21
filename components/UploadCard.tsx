"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";

/**
 * Drag-and-drop upload. After upload completes, the parent triggers the
 * extract → match → draft → risks pipeline; this component only owns the
 * upload itself.
 */
export function UploadCard({ onUploaded }: { onUploaded: (tenderId: string) => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setDragging] = useState(false);
  const [isUploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFile = useCallback(
    async (file: File) => {
      setError(null);
      if (file.size > 25 * 1024 * 1024) {
        setError("File exceeds 25 MB.");
        return;
      }
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setError("Only PDF files are accepted.");
        return;
      }
      setUploading(true);
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/tenders/upload", { method: "POST", body: form });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          setError(data?.error || "Upload failed.");
          setUploading(false);
          return;
        }
        const data = (await res.json()) as { id: string };
        onUploaded(data.id);
        router.refresh();
      } catch {
        setError("Network error during upload.");
      } finally {
        setUploading(false);
      }
    },
    [onUploaded, router],
  );

  return (
    <div className="space-y-2">
      <label htmlFor="tender-pdf-input" className="label block">
        Upload tender PDF
      </label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void onFile(file);
        }}
        className={[
          "relative border border-dashed transition-colors duration-160 ease-out",
          isDragging ? "border-ink bg-surface-sunk" : "border-border-strong bg-surface",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          id="tender-pdf-input"
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onFile(file);
          }}
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="w-full text-left p-7 flex items-start gap-5 hover:bg-surface-sunk transition-colors duration-160 ease-out disabled:cursor-wait"
        >
          <Upload
            size={20}
            strokeWidth={1.5}
            className="text-ink-2 mt-1 shrink-0"
            aria-hidden="true"
          />
          <div className="space-y-1">
            <div className="font-serif text-20 text-ink leading-tight">
              {isUploading ? "Uploading and parsing the PDF…" : "Drop a tender PDF here, or click to select."}
            </div>
            <p className="text-13 text-ink-muted">
              PDFs up to 25 MB. Text is extracted and stored. Scanned-image PDFs are not supported.
            </p>
          </div>
        </button>

        {error ? (
          <p className="px-7 pb-4 text-13 text-accent" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
