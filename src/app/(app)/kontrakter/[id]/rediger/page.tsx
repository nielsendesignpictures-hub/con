import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Category, Contract, Location } from "@/lib/types";
import { ContractForm } from "@/components/contract-form";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Redigér kontrakt" };
export const dynamic = "force-dynamic";

export default async function EditContractPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect(`/kontrakter/${params.id}`);

  const [{ data: contract }, { data: locations }, { data: categories }] = await Promise.all([
    supabase.from("contracts").select("*").eq("id", params.id).single(),
    supabase.from("locations").select("*").order("name"),
    supabase.from("categories").select("*").order("name"),
  ]);
  if (!contract) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Redigér kontrakt" description={(contract as Contract).supplier} />
      <ContractForm
        contract={contract as Contract}
        locations={(locations ?? []) as Location[]}
        categories={(categories ?? []) as Category[]}
      />
    </div>
  );
}
