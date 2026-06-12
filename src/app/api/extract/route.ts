import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getExtractor, lowConfidenceFields } from "@/lib/ai/extract";

/** POST /api/extract - AI-analyse af uploadet PDF (501 hvis ikke konfigureret) */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  const extractor = getExtractor();
  if (!extractor) {
    return NextResponse.json(
      { error: "AI-analyse er ikke aktiveret. Udfyld felterne manuelt." },
      { status: 501 }
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.type !== "application/pdf") {
    return NextResponse.json({ error: "Vedhæft en PDF-fil" }, { status: 400 });
  }

  try {
    const result = await extractor.extract(await file.arrayBuffer(), file.name);
    return NextResponse.json({ ...result, needs_validation: lowConfidenceFields(result) });
  } catch (e) {
    return NextResponse.json(
      { error: `AI-analyse fejlede: ${e instanceof Error ? e.message : "ukendt fejl"}` },
      { status: 502 }
    );
  }
}
