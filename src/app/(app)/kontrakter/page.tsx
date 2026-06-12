import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Category, ContractOverview, Location } from "@/lib/types";
import { ContractTable } from "@/components/contract-table";
import { ContractFilters } from "@/components/contract-filters";
import { Button, PageHeader } from "@/components/ui";

export const metadata = { title: "Kontrakter" };
export const dynamic = "force-dynamic";

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: { q?: string; lokation?: string; kategori?: string; status?: string; udlob?: string };
}) {
  const supabase = createClient();

  const [{ data: isAdmin }, { data: locations }, { data: categories }] = await Promise.all([
    supabase.rpc("is_admin"),
    supabase.from("locations").select("*").order("name"),
    supabase.from("categories").select("*").order("name"),
  ]);

  let query = supabase
    .from("contract_overview")
    .select("*")
    .order("days_to_deadline", { ascending: true });

  if (searchParams.q) query = query.ilike("supplier", `%${searchParams.q}%`);
  if (searchParams.lokation) query = query.eq("location_id", searchParams.lokation);
  if (searchParams.kategori) query = query.eq("category_id", searchParams.kategori);

  const s = searchParams.status;
  if (s === "red" || s === "yellow" || s === "green") {
    query = query.eq("status", "active").eq("urgency", s);
  } else if (s) {
    query = query.eq("status", s);
  }

  if (searchParams.udlob) {
    const months = parseInt(searchParams.udlob, 10);
    const limit = new Date();
    limit.setMonth(limit.getMonth() + months);
    query = query.lte("expiry_date", limit.toISOString().slice(0, 10));
  }

  const { data } = await query;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Kontrakter"
        description={`${data?.length ?? 0} kontrakt(er)`}
        action={
          isAdmin ? (
            <Link href="/kontrakter/ny">
              <Button>
                <Plus size={15} /> Ny kontrakt
              </Button>
            </Link>
          ) : undefined
        }
      />
      <Suspense>
        <ContractFilters
          locations={(locations ?? []) as Location[]}
          categories={(categories ?? []) as Category[]}
        />
      </Suspense>
      <ContractTable contracts={(data ?? []) as ContractOverview[]} />
    </div>
  );
}
