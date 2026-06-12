"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { Category, Location } from "@/lib/types";
import { Input, Select } from "@/components/ui";

export function ContractFilters({
  locations,
  categories,
}: {
  locations: Location[];
  categories: Category[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      router.replace(`/kontrakter?${next.toString()}`);
    },
    [params, router]
  );

  return (
    <div className="mb-4 grid grid-cols-2 gap-2 md:flex md:flex-wrap">
      <Input
        placeholder="Søg leverandør…"
        defaultValue={params.get("q") ?? ""}
        onChange={(e) => setParam("q", e.target.value)}
        className="md:w-52"
      />
      <Select
        value={params.get("lokation") ?? ""}
        onChange={(e) => setParam("lokation", e.target.value)}
        className="md:w-44"
      >
        <option value="">Alle lokationer</option>
        {locations.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </Select>
      <Select
        value={params.get("kategori") ?? ""}
        onChange={(e) => setParam("kategori", e.target.value)}
        className="md:w-44"
      >
        <option value="">Alle kategorier</option>
        {categories.map((k) => (
          <option key={k.id} value={k.id}>
            {k.name}
          </option>
        ))}
      </Select>
      <Select
        value={params.get("status") ?? ""}
        onChange={(e) => setParam("status", e.target.value)}
        className="md:w-44"
      >
        <option value="">Alle statusser</option>
        <option value="red">🔴 Frist ≤ 30 dage</option>
        <option value="yellow">🟡 Frist ≤ 60 dage</option>
        <option value="green">🟢 Ingen handling</option>
        <option value="terminated">Opsagt</option>
        <option value="renegotiated">Genforhandlet</option>
        <option value="expired">Udløbet</option>
      </Select>
      <Select
        value={params.get("udlob") ?? ""}
        onChange={(e) => setParam("udlob", e.target.value)}
        className="md:w-44"
      >
        <option value="">Alle udløbsdatoer</option>
        <option value="3">Udløber inden 3 mdr</option>
        <option value="6">Udløber inden 6 mdr</option>
        <option value="12">Udløber inden 12 mdr</option>
      </Select>
    </div>
  );
}
