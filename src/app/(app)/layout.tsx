import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { count: unreadCount }, { count: actionCount }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false),
    supabase
      .from("contract_overview")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .lte("days_to_deadline", 30),
  ]);

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Sidebar
        isAdmin={profile?.role === "admin"}
        userName={profile?.full_name || profile?.email || ""}
        unreadCount={unreadCount ?? 0}
        actionCount={actionCount ?? 0}
      />
      <main className="flex-1 overflow-x-hidden p-4 md:p-8">{children}</main>
    </div>
  );
}
