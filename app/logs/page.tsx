import { Shell } from "@/components/Shell";
import { LogsPageClient } from "@/components/LogsPageClient";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  void headers();
  return (
    <Shell>
      <div className="px-7 lg:px-9 py-7">
        <div className="max-w-[68rem] mx-auto space-y-7">
          <header>
            <h1 className="font-serif text-31 text-ink leading-tight">Logs</h1>
          </header>
          <LogsPageClient />
        </div>
      </div>
    </Shell>
  );
}
