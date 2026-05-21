"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function UploadCard({ onUploaded }: { onUploaded: (tenderId: string) => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setDragging] = useState(false);
  const [isUploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFile = useCallback(
    async (file: File) => {
      setError(null);
      if (file.size > 25 * 1024 * 1024) { setError("File exceeds 25 MB."); return; }
      if (!file.name.toLowerCase().endsWith(".pdf")) { setError("Only PDF files are accepted."); return; }
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
    <section className="mb-16">
      <input
        ref={inputRef}
        id="tender-pdf-input"
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); }}
      />
      <div
        onClick={() => !isUploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void onFile(f);
        }}
        role="button"
        tabIndex={0}
        aria-label="Upload tender PDF"
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
        className={[
          "h-64 flex flex-col items-center justify-center p-8 cursor-pointer transition-all",
          isDragging ? "bg-surface-container-low" : "bg-surface-container-lowest hover:bg-surface",
        ].join(" ")}
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' stroke='%237e775f' stroke-width='2' stroke-dasharray='8%2c 12' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e\")",
        }}
      >
        <span
          className="material-symbols-outlined text-outline mb-4 transition-transform group-hover:scale-110"
          style={{ fontSize: "2.5rem" }}
        >
          upload_file
        </span>
        <p className="font-label-md text-label-md text-on-surface-variant mb-6 text-center">
          {isUploading
            ? "UPLOADING AND PARSING THE PDF…"
            : "DRAG AND DROP A TENDER PDF OR CLICK TO BROWSE"}
        </p>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
          disabled={isUploading}
          className="bg-primary-container text-on-primary-container px-8 py-3 font-label-md text-label-md heavy-border hover:shadow-[4px_4px_0px_0px_#333] transition-all active:scale-95 disabled:opacity-50"
        >
          UPLOAD PDF
        </button>
      </div>
      {error ? (
        <p className="mt-2 font-body-md text-body-md text-error" role="alert">{error}</p>
      ) : null}
    </section>
  );
}
