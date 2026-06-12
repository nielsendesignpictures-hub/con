"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { savePushSubscription } from "@/app/actions/notifications";
import { Button } from "@/components/ui";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function PushToggle() {
  const [state, setState] = useState<"unsupported" | "off" | "on" | "working">("working");

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setState("unsupported");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })();
  }, []);

  async function enable() {
    setState("working");
    try {
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) {
        alert("Push er ikke konfigureret (VAPID-nøgle mangler).");
        setState("off");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      await savePushSubscription(sub.toJSON() as never);
      setState("on");
    } catch {
      setState("off");
    }
  }

  if (state === "unsupported") {
    return (
      <p className="text-xs text-muted-foreground">
        Push understøttes ikke i denne browser. På iPhone: føj appen til hjemmeskærmen først
        (kræver iOS 16.4+).
      </p>
    );
  }
  if (state === "on") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-status-green">
        <BellRing size={13} /> Push-notifikationer er aktiveret på denne enhed
      </p>
    );
  }
  return (
    <Button variant="ghost" onClick={enable} disabled={state === "working"}>
      <BellRing size={15} />
      {state === "working" ? "Arbejder…" : "Aktivér push-notifikationer på denne enhed"}
    </Button>
  );
}
