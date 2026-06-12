import Link from "next/link";
import type { ContractOverview } from "@/lib/types";
import { daysLabel, formatDate, STATUS_LABEL } from "@/lib/contracts";
import { EmptyState, UrgencyBadge } from "@/components/ui";

export function ContractTable({ contracts }: { contracts: ContractOverview[] }) {
  if (contracts.length === 0) {
    return <EmptyState>Ingen kontrakter matcher.</EmptyState>;
  }

  return (
    <>
      {/* Desktop-tabel */}
      <div className="hidden overflow-hidden rounded-lg border border-border md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Leverandør</th>
              <th className="px-4 py-2.5 font-medium">Lokation</th>
              <th className="px-4 py-2.5 font-medium">Kategori</th>
              <th className="px-4 py-2.5 font-medium">Udløb</th>
              <th className="px-4 py-2.5 font-medium">Opsigelsesfrist</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3">
                  <Link href={`/kontrakter/${c.id}`} className="font-medium hover:underline">
                    {c.supplier}
                  </Link>
                  {c.title && <div className="text-xs text-muted-foreground">{c.title}</div>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{c.location_name}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.category_name}</td>
                <td className="px-4 py-3">{formatDate(c.expiry_date)}</td>
                <td className="px-4 py-3">
                  {formatDate(c.termination_deadline)}
                  {c.status === "active" && (
                    <div className="text-xs text-muted-foreground">
                      {daysLabel(c.days_to_deadline)}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {c.status === "active" ? (
                    <UrgencyBadge urgency={c.urgency} />
                  ) : (
                    <span className="text-xs text-muted-foreground">{STATUS_LABEL[c.status]}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobil-kort */}
      <div className="space-y-2 md:hidden">
        {contracts.map((c) => (
          <Link
            key={c.id}
            href={`/kontrakter/${c.id}`}
            className="block rounded-lg border border-border bg-card p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium">{c.supplier}</div>
              {c.status === "active" ? (
                <UrgencyBadge urgency={c.urgency} label={daysLabel(c.days_to_deadline)} />
              ) : (
                <span className="text-xs text-muted-foreground">{STATUS_LABEL[c.status]}</span>
              )}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {c.location_name} · {c.category_name}
            </div>
            <div className="mt-2 text-xs">
              Opsigelsesfrist: <span className="font-medium">{formatDate(c.termination_deadline)}</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
