import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { ContractDocument, ContractOverview } from "@/lib/types";
import { Card, PageHeader, UrgencyBadge, EmptyState } from "@/components/ui";
import { daysLabel, formatDate } from "@/lib/contracts";
import { ArrowRight } from "lucide-react";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();

  const [{ data: active }, { data: recentDocs }] = await Promise.all([
    supabase
      .from("contract_overview")
      .select("*")
      .eq("status", "active")
      .order("days_to_deadline", { ascending: true }),
    supabase
      .from("contract_documents")
      .select("*")
      .order("uploaded_at", { ascending: false })
      .limit(5),
  ]);

  const contracts = (active ?? []) as ContractOverview[];
  const red = contracts.filter((c) => c.urgency === "red");
  const yellow = contracts.filter((c) => c.urgency === "yellow");
  const needAction = [...red, ...yellow].slice(0, 8);

  const byLocation = new Map<string, number>();
  const byCategory = new Map<string, number>();
  for (const c of contracts) {
    byLocation.set(c.location_name, (byLocation.get(c.location_name) ?? 0) + 1);
    byCategory.set(c.category_name, (byCategory.get(c.category_name) ?? 0) + 1);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Dashboard" description="Overblik over alle leverandørkontrakter" />

      {/* Nøgletal */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Link href="/handling">
          <Card className="transition-colors hover:border-status-red/50">
            <div className="text-2xl font-semibold text-status-red">{red.length}</div>
            <div className="mt-1 text-xs text-muted-foreground">Kræver handling nu (≤ 30 dage)</div>
          </Card>
        </Link>
        <Link href="/handling">
          <Card className="transition-colors hover:border-status-yellow/50">
            <div className="text-2xl font-semibold text-status-yellow">{yellow.length}</div>
            <div className="mt-1 text-xs text-muted-foreground">Frist inden for 60 dage</div>
          </Card>
        </Link>
        <Link href="/kontrakter">
          <Card className="transition-colors hover:border-primary/50">
            <div className="text-2xl font-semibold">{contracts.length}</div>
            <div className="mt-1 text-xs text-muted-foreground">Aktive kontrakter</div>
          </Card>
        </Link>
        <Link href="/lokationer">
          <Card className="transition-colors hover:border-primary/50">
            <div className="text-2xl font-semibold">{byLocation.size}</div>
            <div className="mt-1 text-xs text-muted-foreground">Lokationer med kontrakter</div>
          </Card>
        </Link>
      </div>

      {/* Handling kræves */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Kontrakter der kræver handling</h2>
          <Link
            href="/handling"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Se alle <ArrowRight size={12} />
          </Link>
        </div>
        {needAction.length === 0 ? (
          <EmptyState>🎉 Ingen kontrakter kræver handling lige nu.</EmptyState>
        ) : (
          <div className="space-y-2">
            {needAction.map((c) => (
              <Link
                key={c.id}
                href={`/kontrakter/${c.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{c.supplier}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {c.location_name} · {c.category_name} · frist{" "}
                    {formatDate(c.termination_deadline)}
                  </div>
                </div>
                <UrgencyBadge urgency={c.urgency} label={daysLabel(c.days_to_deadline)} />
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pr. lokation */}
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Kontrakter pr. lokation</h2>
          <ul className="space-y-2 text-sm">
            {[...byLocation.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([name, count]) => (
                <li key={name} className="flex justify-between">
                  <span className="text-muted-foreground">{name}</span>
                  <span className="font-medium">{count}</span>
                </li>
              ))}
            {byLocation.size === 0 && <li className="text-muted-foreground">Ingen endnu</li>}
          </ul>
        </Card>

        {/* Pr. kategori */}
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Kontrakter pr. kategori</h2>
          <ul className="space-y-2 text-sm">
            {[...byCategory.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([name, count]) => (
                <li key={name} className="flex justify-between">
                  <span className="text-muted-foreground">{name}</span>
                  <span className="font-medium">{count}</span>
                </li>
              ))}
            {byCategory.size === 0 && <li className="text-muted-foreground">Ingen endnu</li>}
          </ul>
        </Card>

        {/* Seneste uploads */}
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Seneste uploads</h2>
          <ul className="space-y-2 text-sm">
            {((recentDocs ?? []) as ContractDocument[]).map((d) => (
              <li key={d.id}>
                <Link href={`/kontrakter/${d.contract_id}`} className="hover:underline">
                  <div className="truncate">{d.file_name}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(d.uploaded_at)}</div>
                </Link>
              </li>
            ))}
            {(recentDocs ?? []).length === 0 && (
              <li className="text-muted-foreground">Ingen uploads endnu</li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
