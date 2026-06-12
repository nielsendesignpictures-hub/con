import type { Urgency } from "./types";

/** Statuslogik - spejler `urgency` i contract_overview-viewet */
export function urgencyFor(daysToDeadline: number, status: string): Urgency {
  if (status !== "active") return "none";
  if (daysToDeadline <= 30) return "red";
  if (daysToDeadline <= 60) return "yellow";
  return "green";
}

export const URGENCY_LABEL: Record<Urgency, string> = {
  red: "Handling kræves",
  yellow: "Frist inden for 60 dage",
  green: "Ingen handling nødvendig",
  none: "—",
};

export const STATUS_LABEL: Record<string, string> = {
  active: "Aktiv",
  terminated: "Opsagt",
  renegotiated: "Genforhandlet",
  expired: "Udløbet",
};

export function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("da-DK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function daysLabel(days: number): string {
  if (days < 0) return `Overskredet med ${Math.abs(days)} dage`;
  if (days === 0) return "I dag";
  if (days === 1) return "1 dag";
  return `${days} dage`;
}
