/**
 * Pluggable AI-kontraktanalyse.
 *
 * Deaktiveret som standard. Aktivér ved at sætte AI_PROVIDER (anthropic|openai)
 * og AI_API_KEY i miljøvariablerne - intet andet i appen skal ændres.
 *
 * Felter med confidence < CONFIDENCE_THRESHOLD lægges i needs_validation,
 * og formularen markerer dem som "kræver manuel validering".
 */

export interface ExtractionResult {
  supplier: string | null;
  title: string | null;
  start_date: string | null; // ISO yyyy-mm-dd
  binding_months: number | null;
  expiry_date: string | null;
  notice_months: number | null;
  auto_renews: boolean | null;
  renewal_months: number | null;
  notes: string | null;
  /** 0-1 pr. felt */
  confidence: Partial<Record<keyof Omit<ExtractionResult, "confidence">, number>>;
}

export interface ContractExtractor {
  extract(pdf: ArrayBuffer, fileName: string): Promise<ExtractionResult>;
}

export const CONFIDENCE_THRESHOLD = 0.8;

const EXTRACTION_PROMPT = `Du er ekspert i danske leverandørkontrakter. Udtræk følgende felter fra kontrakten og svar KUN med JSON:
{
  "supplier": "leverandørens navn",
  "title": "kort beskrivelse af aftalen",
  "start_date": "yyyy-mm-dd eller null",
  "binding_months": tal eller null,
  "expiry_date": "yyyy-mm-dd eller null",
  "notice_months": opsigelsesvarsel i måneder eller null,
  "auto_renews": true/false/null,
  "renewal_months": forlængelsesperiode i måneder eller null,
  "notes": "vigtige bemærkninger (særvilkår, prisreguleringer, bod) eller null",
  "confidence": { "feltnavn": 0.0-1.0 for hvert felt }
}
Vær konservativ med confidence: er du i tvivl, så sæt den under 0.8.`;

class AnthropicExtractor implements ContractExtractor {
  constructor(private apiKey: string) {}

  async extract(pdf: ArrayBuffer, fileName: string): Promise<ExtractionResult> {
    const base64 = Buffer.from(pdf).toString("base64");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: { type: "base64", media_type: "application/pdf", data: base64 },
              },
              { type: "text", text: EXTRACTION_PROMPT },
            ],
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return parseJsonResponse(data.content?.[0]?.text ?? "{}");
  }
}

class OpenAIExtractor implements ContractExtractor {
  constructor(private apiKey: string) {}

  async extract(pdf: ArrayBuffer, fileName: string): Promise<ExtractionResult> {
    const base64 = Buffer.from(pdf).toString("base64");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "file",
                file: { filename: fileName, file_data: `data:application/pdf;base64,${base64}` },
              },
              { type: "text", text: EXTRACTION_PROMPT },
            ],
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI API: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return parseJsonResponse(data.choices?.[0]?.message?.content ?? "{}");
  }
}

function parseJsonResponse(text: string): ExtractionResult {
  const match = text.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(match ? match[0] : "{}");
  return {
    supplier: parsed.supplier ?? null,
    title: parsed.title ?? null,
    start_date: parsed.start_date ?? null,
    binding_months: parsed.binding_months ?? null,
    expiry_date: parsed.expiry_date ?? null,
    notice_months: parsed.notice_months ?? null,
    auto_renews: parsed.auto_renews ?? null,
    renewal_months: parsed.renewal_months ?? null,
    notes: parsed.notes ?? null,
    confidence: parsed.confidence ?? {},
  };
}

/** Returnerer null hvis AI ikke er konfigureret */
export function getExtractor(): ContractExtractor | null {
  const provider = process.env.AI_PROVIDER;
  const key = process.env.AI_API_KEY;
  if (!provider || !key) return null;
  if (provider === "anthropic") return new AnthropicExtractor(key);
  if (provider === "openai") return new OpenAIExtractor(key);
  return null;
}

/** Felter der skal markeres "kræver manuel validering" */
export function lowConfidenceFields(result: ExtractionResult): string[] {
  return Object.entries(result.confidence)
    .filter(([, c]) => (c ?? 0) < CONFIDENCE_THRESHOLD)
    .map(([field]) => field);
}
