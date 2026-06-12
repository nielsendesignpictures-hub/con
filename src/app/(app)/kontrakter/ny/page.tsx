import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Category, Location } from "@/lib/types";
import { ContractForm } from "@/components/contract-form";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Ny kontrakt" };
export const dynamic = "force-dynamic";

export default async function NewContractPage() {
  const supabase = createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/kontrakter");

  const [{ data: locations }, { data: categories }] = await Promise.all([
    supabase.from("locations").select("*").eq("active", true).order("name"),
    supabase.from("categories").select("*").order("name"),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Ny kontrakt"
        description="Upload en PDF for automatisk udfyldning, eller indtast manuelt"
      />
      <ContractForm
        locations={(locations ?? []) as Location[]}
        categories={(categories ?? []) as Category[]}
      />
    </div>
  );
}
