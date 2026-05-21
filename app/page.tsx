import { Shell } from "@/components/Shell";
import { TenderListClient } from "@/components/TenderListClient";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <Shell>
      <div className="flex-1 flex flex-col">
        <header className="sticky top-0 z-40 bg-surface border-b border-outline-variant/30 px-10 py-4">
          <h1 className="font-headline-md text-headline-md text-primary">
            Tender Response Assistant
          </h1>
        </header>
        <main className="flex-1 w-full max-w-5xl mx-auto px-10 py-12">
          <section className="mb-12">
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-4">Tenders</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
              Upload a tender PDF. Requirements are extracted, matched against your capability
              matrix, drafted, and screened for risk. You review the result.
            </p>
          </section>
          <TenderListClient />
        </main>
      </div>
    </Shell>
  );
}
