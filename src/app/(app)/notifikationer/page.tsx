import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { AppNotification } from "@/lib/types";
import { markAllRead } from "@/app/actions/notifications";
import { Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { PushToggle } from "@/components/push-toggle";
import { cn } from "@/lib/utils";

export const metadata = { title: "Notifikationer" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const notifications = (data ?? []) as AppNotification[];
  const hasUnread = notifications.some((n) => !n.read);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Notifikationer"
        action={
          hasUnread ? (
            <form action={markAllRead}>
              <Button variant="ghost" type="submit">
                Markér alle som læst
              </Button>
            </form>
          ) : undefined
        }
      />

      <Card className="mb-5">
        <PushToggle />
      </Card>

      {notifications.length === 0 ? (
        <EmptyState>
          Ingen notifikationer endnu. Du får besked 1 måned før en opsigelsesfrist.
        </EmptyState>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Link
              key={n.id}
              href={n.contract_id ? `/kontrakter/${n.contract_id}` : "/handling"}
              className={cn(
                "block rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/40",
                !n.read && "border-l-2 border-l-primary"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">{n.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(n.created_at).toLocaleDateString("da-DK")}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
