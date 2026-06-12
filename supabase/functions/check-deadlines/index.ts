// Supabase Edge Function: check-deadlines
// Kører dagligt (cron). Finder aktive kontrakter med opsigelsesfrist inden for
// 30 dage og sender interne notifikationer + web push + e-mail (én gang pr. frist).
//
// Deploy:  npx supabase functions deploy check-deadlines
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, RESEND_API_KEY (valgfri)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const WARN_DAYS = 30; // advar 1 måned før opsigelsesfrist

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // service role: omgår RLS
  );

  // 1. Kontrakter der nærmer sig fristen
  const { data: contracts, error } = await supabase
    .from("contract_overview")
    .select("id, supplier, location_name, termination_deadline, days_to_deadline")
    .eq("status", "active")
    .lte("days_to_deadline", WARN_DAYS);

  if (error) return new Response(error.message, { status: 500 });

  // 2. Filtrér allerede-sendte påmindelser fra
  const { data: log } = await supabase.from("reminder_log").select("contract_id, deadline");
  const alreadySent = new Set((log ?? []).map((r) => `${r.contract_id}:${r.deadline}`));
  const pending = (contracts ?? []).filter(
    (c) => !alreadySent.has(`${c.id}:${c.termination_deadline}`)
  );

  if (pending.length === 0) {
    return Response.json({ ok: true, sent: 0 });
  }

  // 3. Modtagere
  const { data: users } = await supabase.from("profiles").select("id, email");
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth_key");

  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");

  if (vapidPublic && vapidPrivate) {
    webpush.setVapidDetails("mailto:admin@example.com", vapidPublic, vapidPrivate);
  }

  let sent = 0;
  for (const c of pending) {
    const deadline = new Date(c.termination_deadline).toLocaleDateString("da-DK");
    const title = "Opsigelsesfrist nærmer sig";
    const body =
      `Kontrakten med ${c.supplier} for ${c.location_name} nærmer sig opsigelsesfristen (${deadline}). ` +
      `Vurder om aftalen skal opsiges eller genforhandles.`;

    // a) Interne notifikationer til alle brugere
    await supabase.from("notifications").insert(
      (users ?? []).map((u) => ({ user_id: u.id, contract_id: c.id, title, body }))
    );

    // b) Web push
    if (vapidPublic && vapidPrivate) {
      const payload = JSON.stringify({ title, body, url: `/kontrakter/${c.id}` });
      await Promise.allSettled(
        (subs ?? []).map((s) =>
          webpush
            .sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } },
              payload
            )
            .catch(async (err: { statusCode?: number }) => {
              // Udløbet abonnement -> ryd op
              if (err.statusCode === 404 || err.statusCode === 410) {
                await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
              }
            })
        )
      );
    }

    // c) E-mail via Resend (valgfri)
    if (resendKey && users?.length) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Kontraktstyring <onboarding@resend.dev>",
          to: users.map((u) => u.email),
          subject: `⚠ ${title}: ${c.supplier} – ${c.location_name}`,
          text: body,
        }),
      }).catch(() => {});
    }

    // d) Markér som sendt
    await supabase
      .from("reminder_log")
      .insert({ contract_id: c.id, deadline: c.termination_deadline });
    sent++;
  }

  return Response.json({ ok: true, sent });
});
