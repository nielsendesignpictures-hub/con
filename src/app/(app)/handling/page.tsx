import { createClient } from "@/lib/supabase/server";
import type { ContractOverview } from "@/lib/types";
import { ContractTable } from "@/components/contract-table";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Handling kræves" };
export const dynamic = "force-dynamic";

/** Alle aktive kontrakter sorteret efter hvor tæt de er på opsigelsesfristen */
export default async function HandlingPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("contract_overview")
    .select("*")
    .eq("status", "active")
    .order("days_to_deadline", { ascending: true });

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Handling kræves"
        description="Alle aktive kontrakter sorteret efter dage til opsigelsesfrist — de mest kritiske øverst"
      />
      <ContractTable contracts={(data ?? []) as ContractOverview[]} />
    </div>
  );
}
