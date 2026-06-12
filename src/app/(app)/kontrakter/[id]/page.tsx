import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { ContractDocument, ContractOverview } from "@/lib/types";
import { daysLabel, formatDate, STATUS_LABEL } from "@/lib/contracts";
import { Button, Card, UrgencyBadge } from "@/components/ui";
import { DeleteContractButton } from "@/components/delete-contract-button";

export const metadata = { title: "Kontraktdetaljer" };
export const dynamic = "force-dynamic";

export default async function ContractDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: contract }, { data: docs }, { data: isAdmin }] = await Promise.all([
    supabase.from("contract_overview").select("*").eq("id", params.id).single(),
    supabase
      .from("contract_documents")
      .select("*")
      .eq("contract_id", params.id)
      .order("uploaded_at", { ascending: false }),
    supabase.rpc("is_admin"),
  ]);

  if (!contract) notFound();
  const c = contract as ContractOverview;

  // Signerede download-links (10 min gyldighed)
  const documents = await Promise.all(
    ((docs ?? []) as ContractDocument[]).map(async (d) => {
      const { data } = await supabase.storage
        .from("contracts")
        .createSignedUrl(d.storage_path, 600);
      return { ...d, url: data?.signedUrl ?? null };
    })
  );

  const rows: [string, React.ReactNode][] = [
    ["Lokation", `${c.location_name} (CVR ${c.location_cvr})`],
    ["Kategori", c.category_name],
    ["Kontraktstart", formatDate(c.start_date)],
    ["Bindingsperiode", c.binding_months != null ? `${c.binding_months} mdr` : "—"],
    ["Udløbsdato", formatDate(c.expiry_date)],
    ["Opsigelsesvarsel", `${c.notice_months} mdr`],
    [
      "Opsigelsesfrist",
      <span key="d" className="font-medium">
        {formatDate(c.termination_deadline)}
        {c.status === "active" && (
          <span className="ml-2 text-xs text-muted-foreground">
            ({daysLabel(c.days_to_deadline)})
          </span>
        )}
      </span>,
    ],
    [
      "Automatisk forlængelse",
      c.auto_renews ? `Ja${c.renewal_months ? ` (${c.renewal_months} mdr)` : ""}` : "Nej",
    ],
    ["Status", STATUS_LABEL[c.status]],
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/kontrakter"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} /> Kontrakter
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{c.supplier}</h1>
          {c.title && <p className="mt-1 text-sm text-muted-foreground">{c.title}</p>}
        </div>
        <div className="flex items-center gap-2">
          {c.status === "active" && (
            <UrgencyBadge urgency={c.urgency} label={daysLabel(c.days_to_deadline)} />
          )}
          {isAdmin && (
            <>
              <Link href={`/kontrakter/${c.id}/rediger`}>
                <Button variant="ghost">
                  <Pencil size={14} /> Redigér
                </Button>
              </Link>
              <DeleteContractButton id={c.id} />
            </>
          )}
        </div>
      </div>

      {c.needs_validation.length > 0 && (
        <div className="mb-4 rounded-lg border border-status-yellow/40 bg-status-yellow/10 px-4 py-3 text-sm">
          ⚠ Felter der kræver manuel validering: {c.needs_validation.join(", ")}
        </div>
      )}

      <Card className="mb-4 p-0">
        <dl className="divide-y divide-border">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-right">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {c.notes && (
        <Card className="mb-4">
          <h2 className="mb-2 text-sm font-semibold">Bemærkninger</h2>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{c.notes}</p>
        </Card>
      )}

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Dokumenter</h2>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ingen dokumenter uploadet.</p>
        ) : (
          <ul className="space-y-2">
            {documents.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <FileText size={15} className="shrink-0 text-muted-foreground" />
                  <span className="truncate">{d.file_name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(d.uploaded_at)}
                  </span>
                </span>
                {d.url && (
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-xs text-primary hover:underline"
                  >
                    Hent PDF
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
