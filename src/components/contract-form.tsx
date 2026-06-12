"use client";

import { useRef, useState, useTransition } from "react";
import { AlertTriangle, Sparkles } from "lucide-react";
import type { Category, Contract, Location } from "@/lib/types";
import { createContract, updateContract } from "@/app/actions/contracts";
import { Button, Card, Input, Label, Select, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";

type FieldValues = {
  supplier: string;
  title: string;
  start_date: string;
  binding_months: string;
  expiry_date: string;
  notice_months: string;
  auto_renews: boolean;
  renewal_months: string;
  notes: string;
};

export function ContractForm({
  locations,
  categories,
  contract,
}: {
  locations: Location[];
  categories: Category[];
  contract?: Contract; // udfyldt = redigér
}) {
  const [pending, startTransition] = useTransition();
  const [analyzing, setAnalyzing] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [needsValidation, setNeedsValidation] = useState<string[]>(
    contract?.needs_validation ?? []
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const [v, setV] = useState<FieldValues>({
    supplier: contract?.supplier ?? "",
    title: contract?.title ?? "",
    start_date: contract?.start_date ?? "",
    binding_months: contract?.binding_months?.toString() ?? "",
    expiry_date: contract?.expiry_date ?? "",
    notice_months: contract?.notice_months?.toString() ?? "",
    auto_renews: contract?.auto_renews ?? false,
    renewal_months: contract?.renewal_months?.toString() ?? "",
    notes: contract?.notes ?? "",
  });

  const set = (k: keyof FieldValues, val: string | boolean) =>
    setV((prev) => ({ ...prev, [k]: val }));

  /** Forsøg AI-analyse når en PDF vælges */
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnalyzing(true);
    setAiMessage(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/extract", { method: "POST", body: fd });
      const data = await res.json();
      if (res.status === 501) {
        setAiMessage("AI-analyse er ikke aktiveret — udfyld felterne manuelt.");
        return;
      }
      if (!res.ok) {
        setAiMessage(data.error ?? "AI-analyse fejlede — udfyld felterne manuelt.");
        return;
      }
      setV((prev) => ({
        ...prev,
        supplier: data.supplier ?? prev.supplier,
        title: data.title ?? prev.title,
        start_date: data.start_date ?? prev.start_date,
        binding_months: data.binding_months?.toString() ?? prev.binding_months,
        expiry_date: data.expiry_date ?? prev.expiry_date,
        notice_months: data.notice_months?.toString() ?? prev.notice_months,
        auto_renews: data.auto_renews ?? prev.auto_renews,
        renewal_months: data.renewal_months?.toString() ?? prev.renewal_months,
        notes: data.notes ?? prev.notes,
      }));
      setNeedsValidation(data.needs_validation ?? []);
      setAiMessage(
        data.needs_validation?.length
          ? `AI har udfyldt formularen. ${data.needs_validation.length} felt(er) kræver manuel validering (markeret med gult).`
          : "AI har udfyldt formularen — kontrollér værdierne inden du gemmer."
      );
    } catch {
      setAiMessage("AI-analyse fejlede — udfyld felterne manuelt.");
    } finally {
      setAnalyzing(false);
    }
  }

  function submit(formData: FormData) {
    formData.set("needs_validation", needsValidation.join(","));
    const file = fileRef.current?.files?.[0];
    if (file) formData.set("pdf", file);
    startTransition(async () => {
      if (contract) await updateContract(contract.id, formData);
      else await createContract(formData);
    });
  }

  const warn = (field: string) =>
    needsValidation.includes(field) &&
    "border-status-yellow bg-status-yellow/10";

  const ValidationHint = ({ field }: { field: string }) =>
    needsValidation.includes(field) ? (
      <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-status-yellow">
        <AlertTriangle size={11} /> kræver manuel validering
      </span>
    ) : null;

  return (
    <form action={submit} className="max-w-2xl space-y-5">
      <Card className="space-y-4">
        <div>
          <Label>PDF-kontrakt (valgfri)</Label>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary/15 file:px-3 file:py-1.5 file:text-sm file:text-primary"
          />
          {analyzing && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-primary">
              <Sparkles size={12} /> Analyserer kontrakten…
            </p>
          )}
          {aiMessage && <p className="mt-2 text-xs text-muted-foreground">{aiMessage}</p>}
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Lokation *</Label>
            <Select name="location_id" required defaultValue={contract?.location_id ?? ""}>
              <option value="" disabled>
                Vælg lokation
              </option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.cvr})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Kategori *</Label>
            <Select name="category_id" required defaultValue={contract?.category_id ?? ""}>
              <option value="" disabled>
                Vælg kategori
              </option>
              {categories.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <Label>
            Leverandør * <ValidationHint field="supplier" />
          </Label>
          <Input
            name="supplier"
            required
            value={v.supplier}
            onChange={(e) => set("supplier", e.target.value)}
            className={cn(warn("supplier"))}
          />
        </div>

        <div>
          <Label>Beskrivelse</Label>
          <Input
            name="title"
            value={v.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="fx Internetforbindelse 1000/1000"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>
              Kontraktstart <ValidationHint field="start_date" />
            </Label>
            <Input
              type="date"
              name="start_date"
              value={v.start_date}
              onChange={(e) => set("start_date", e.target.value)}
              className={cn(warn("start_date"))}
            />
          </div>
          <div>
            <Label>
              Bindingsperiode (måneder) <ValidationHint field="binding_months" />
            </Label>
            <Input
              type="number"
              min={0}
              name="binding_months"
              value={v.binding_months}
              onChange={(e) => set("binding_months", e.target.value)}
              className={cn(warn("binding_months"))}
            />
          </div>
          <div>
            <Label>
              Udløbsdato * <ValidationHint field="expiry_date" />
            </Label>
            <Input
              type="date"
              name="expiry_date"
              required
              value={v.expiry_date}
              onChange={(e) => set("expiry_date", e.target.value)}
              className={cn(warn("expiry_date"))}
            />
          </div>
          <div>
            <Label>
              Opsigelsesvarsel (måneder) * <ValidationHint field="notice_months" />
            </Label>
            <Input
              type="number"
              min={0}
              name="notice_months"
              required
              value={v.notice_months}
              onChange={(e) => set("notice_months", e.target.value)}
              className={cn(warn("notice_months"))}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Opsigelsesfristen beregnes automatisk: udløbsdato minus varsel.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="auto_renews"
              checked={v.auto_renews}
              onChange={(e) => set("auto_renews", e.target.checked)}
              className="h-4 w-4 accent-[hsl(var(--primary))]"
            />
            Automatisk forlængelse
            <ValidationHint field="auto_renews" />
          </label>
          {v.auto_renews && (
            <div className="w-48">
              <Label>Forlængelse (måneder)</Label>
              <Input
                type="number"
                min={1}
                name="renewal_months"
                value={v.renewal_months}
                onChange={(e) => set("renewal_months", e.target.value)}
              />
            </div>
          )}
        </div>

        {contract && (
          <div>
            <Label>Status</Label>
            <Select name="status" defaultValue={contract.status}>
              <option value="active">Aktiv</option>
              <option value="terminated">Opsagt</option>
              <option value="renegotiated">Genforhandlet</option>
              <option value="expired">Udløbet</option>
            </Select>
          </div>
        )}

        <div>
          <Label>
            Bemærkninger <ValidationHint field="notes" />
          </Label>
          <Textarea
            name="notes"
            rows={3}
            value={v.notes}
            onChange={(e) => set("notes", e.target.value)}
            className={cn(warn("notes"))}
          />
        </div>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending || analyzing}>
          {pending ? "Gemmer…" : contract ? "Gem ændringer" : "Opret kontrakt"}
        </Button>
      </div>
    </form>
  );
}
