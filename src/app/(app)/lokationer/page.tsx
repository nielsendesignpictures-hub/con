import Link from "next/link";
import { MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { ContractOverview, Location } from "@/lib/types";
import { createLocation } from "@/app/actions/locations";
import { Button, Card, Input, Label, PageHeader } from "@/components/ui";

export const metadata = { title: "Lokationer" };
export const dynamic = "force-dynamic";

export default async function LocationsPage() {
  const supabase = createClient();
  const [{ data: locations }, { data: contracts }, { data: isAdmin }] = await Promise.all([
    supabase.from("locations").select("*").order("name"),
    supabase.from("contract_overview").select("location_id, urgency, status").eq("status", "active"),
    supabase.rpc("is_admin"),
  ]);

  const stats = new Map<string, { total: number; red: number; yellow: number }>();
  for (const c of (contracts ?? []) as Pick<ContractOverview, "location_id" | "urgency" | "status">[]) {
    const s = stats.get(c.location_id) ?? { total: 0, red: 0, yellow: 0 };
    s.total++;
    if (c.urgency === "red") s.red++;
    if (c.urgency === "yellow") s.yellow++;
    stats.set(c.location_id, s);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Lokationer" description="Én lokation pr. CVR-nummer" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {((locations ?? []) as Location[]).map((l) => {
          const s = stats.get(l.id);
          return (
            <Link key={l.id} href={`/lokationer/${l.id}`}>
              <Card className="h-full transition-colors hover:border-primary/50">
                <div className="flex items-center gap-2">
                  <MapPin size={15} className="text-primary" />
                  <span className="font-medium">{l.name}</span>
                  {!l.active && (
                    <span className="text-[10px] text-muted-foreground">(inaktiv)</span>
                  )}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">CVR {l.cvr}</div>
                <div className="mt-3 flex items-center gap-3 text-xs">
                  <span>{s?.total ?? 0} aktive kontrakter</span>
                  {(s?.red ?? 0) > 0 && (
                    <span className="text-status-red">{s!.red} kritiske</span>
                  )}
                  {(s?.yellow ?? 0) > 0 && (
                    <span className="text-status-yellow">{s!.yellow} snart</span>
                  )}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {isAdmin && (
        <Card className="mt-6 max-w-lg">
          <h2 className="mb-3 text-sm font-semibold">Opret lokation</h2>
          <form action={createLocation} className="space-y-3">
            <div>
              <Label>Navn *</Label>
              <Input name="name" required placeholder="fx Restaurant Aarhus C" />
            </div>
            <div>
              <Label>CVR-nummer * (8 cifre)</Label>
              <Input name="cvr" required pattern="[0-9]{8}" placeholder="12345678" />
            </div>
            <div>
              <Label>Adresse</Label>
              <Input name="address" placeholder="Gade 1, 8000 Aarhus C" />
            </div>
            <Button type="submit">Opret lokation</Button>
          </form>
        </Card>
      )}
    </div>
  );
}
