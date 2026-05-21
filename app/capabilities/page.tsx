import { Shell } from "@/components/Shell";
import { CapabilitiesPageClient } from "@/components/CapabilitiesPageClient";
import { supabaseServer } from "@/lib/supabase/server";
import type { Capability } from "@/lib/types";

export const dynamic = "force-dynamic";

async function loadCapabilities(): Promise<Capability[]> {
  const sb = supabaseServer();
  const res = await sb.from("capabilities").select("*").order("category").order("name");
  return (res.data as Capability[]) ?? [];
}

export default async function CapabilitiesPage() {
  const capabilities = await loadCapabilities();
  return (
    <Shell>
      <div className="px-7 lg:px-9 py-7">
        <div className="max-w-[68rem] mx-auto">
          <CapabilitiesPageClient initial={capabilities} />
        </div>
      </div>
    </Shell>
  );
}
