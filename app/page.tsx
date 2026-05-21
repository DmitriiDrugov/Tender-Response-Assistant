import { Shell } from "@/components/Shell";
import { TenderListClient } from "@/components/TenderListClient";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <Shell>
      <div className="px-7 lg:px-9 py-7">
        <div className="max-w-[68rem] mx-auto space-y-7">
          <header className="space-y-3">
            <h1 className="font-serif text-31 text-ink leading-tight">Tenders</h1>
            <p className="text-14 text-ink-2 max-w-reading">
              Upload a tender PDF. Requirements are extracted, matched against your capability matrix,
              drafted, and screened for risk. You review the result.
            </p>
          </header>

          <TenderListClient />
        </div>
      </div>
    </Shell>
  );
}
