import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { Card, PageHeader } from "@/components/ui";
import { RoleSelect } from "@/components/role-select";

export const metadata = { title: "Administration" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  if (me?.role !== "admin") redirect("/dashboard");

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Administration"
        description="Brugere og roller. Nye brugere oprettes i Supabase Dashboard → Authentication → Users og tildeles derefter en rolle her."
      />

      <Card className="p-0">
        <ul className="divide-y divide-border">
          {((profiles ?? []) as Profile[]).map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{p.full_name || p.email}</div>
                <div className="truncate text-xs text-muted-foreground">{p.email}</div>
              </div>
              <RoleSelect userId={p.id} role={p.role} disabled={p.id === user!.id} />
            </li>
          ))}
        </ul>
      </Card>

      <p className="mt-3 text-xs text-muted-foreground">
        Du kan ikke ændre din egen rolle (forhindrer at systemet mister sin sidste administrator).
      </p>
    </div>
  );
}
