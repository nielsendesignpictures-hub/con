import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { ContractOverview, Location } from "@/lib/types";
import { updateLocation } from "@/app/actions/locations";
import { ContractTable } from "@/components/contract-table";
import { Button, Card, Input, Label, PageHeader } from "@/components/ui";

export const metadata = { title: "Lokation" };
export const dynamic = "force-dynamic";

export default async function LocationDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: location }, { data: contracts }, { data: isAdmin }] = await Promise.all([
    supabase.from("locations").select("*").eq("id", params.id).single(),
    supabase
      .from("contract_overview")
      .select("*")
      .eq("location_id", params.id)
      .order("days_to_deadline", { ascending: true }),
    supabase.rpc("is_admin"),
  ]);

  if (!location) notFound();
  const l = location as Location;
  const updateWithId = updateLocation.bind(null, l.id);

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/lokationer"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} /> Lokationer
      </Link>
      <PageHeader
        title={l.name}
        description={`CVR ${l.cvr}${l.address ? ` · ${l.address}` : ""}`}
      />

      <ContractTable contracts={(contracts ?? []) as ContractOverview[]} />

      {isAdmin && (
        <Card className="mt-6 max-w-lg">
          <h2 className="mb-3 text-sm font-semibold">Redigér lokation</h2>
          <form action={updateWithId} className="space-y-3">
            <div>
              <Label>Navn *</Label>
              <Input name="name" required defaultValue={l.name} />
            </div>
            <div>
              <Label>CVR-nummer *</Label>
              <Input name="cvr" required pattern="[0-9]{8}" defaultValue={l.cvr} />
            </div>
            <div>
              <Label>Adresse</Label>
              <Input name="address" defaultValue={l.address ?? ""} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="active"
                defaultChecked={l.active}
                className="h-4 w-4 accent-[hsl(var(--primary))]"
              />
              Aktiv
            </label>
            <Button type="submit">Gem</Button>
          </form>
        </Card>
      )}
    </div>
  );
}
