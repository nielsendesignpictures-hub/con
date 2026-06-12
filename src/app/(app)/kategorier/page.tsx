import { Tags, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";
import { createCategory, deleteCategory } from "@/app/actions/categories";
import { Button, Card, Input, PageHeader } from "@/components/ui";

export const metadata = { title: "Kategorier" };
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const supabase = createClient();
  const [{ data: categories }, { data: counts }, { data: isAdmin }] = await Promise.all([
    supabase.from("categories").select("*").order("name"),
    supabase.from("contracts").select("category_id"),
    supabase.rpc("is_admin"),
  ]);

  const countMap = new Map<string, number>();
  for (const c of counts ?? []) {
    countMap.set(c.category_id, (countMap.get(c.category_id) ?? 0) + 1);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Kategorier" description="Kontrakttyper på tværs af lokationer" />

      <Card className="p-0">
        <ul className="divide-y divide-border">
          {((categories ?? []) as Category[]).map((k) => (
            <li key={k.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <span className="flex items-center gap-2.5">
                <Tags size={14} className="text-muted-foreground" />
                {k.name}
                <span className="text-xs text-muted-foreground">
                  {countMap.get(k.id) ?? 0} kontrakt(er)
                </span>
              </span>
              {isAdmin && (countMap.get(k.id) ?? 0) === 0 && (
                <form action={deleteCategory.bind(null, k.id)}>
                  <button
                    type="submit"
                    className="text-muted-foreground hover:text-status-red"
                    aria-label={`Slet ${k.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </Card>

      {isAdmin && (
        <Card className="mt-6 max-w-lg">
          <h2 className="mb-3 text-sm font-semibold">Ny kategori</h2>
          <form action={createCategory} className="flex gap-2">
            <Input name="name" required placeholder="fx Forsikring" />
            <Button type="submit" className="shrink-0">
              Tilføj
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
