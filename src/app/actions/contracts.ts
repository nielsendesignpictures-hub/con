"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function contractFromForm(form: FormData) {
  const num = (k: string) => {
    const v = form.get(k)?.toString().trim();
    return v ? parseInt(v, 10) : null;
  };
  const str = (k: string) => form.get(k)?.toString().trim() || null;

  return {
    location_id: form.get("location_id")!.toString(),
    category_id: form.get("category_id")!.toString(),
    supplier: form.get("supplier")!.toString().trim(),
    title: str("title") ?? "",
    start_date: str("start_date"),
    binding_months: num("binding_months"),
    expiry_date: form.get("expiry_date")!.toString(),
    notice_months: num("notice_months") ?? 0,
    auto_renews: form.get("auto_renews") === "on",
    renewal_months: num("renewal_months"),
    status: (str("status") ?? "active") as "active",
    notes: str("notes"),
    needs_validation: (str("needs_validation") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

async function uploadPdf(
  supabase: ReturnType<typeof createClient>,
  contractId: string,
  file: File,
  userId: string
) {
  const path = `${contractId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error: upErr } = await supabase.storage
    .from("contracts")
    .upload(path, file, { contentType: "application/pdf" });
  if (upErr) throw new Error(`Upload fejlede: ${upErr.message}`);

  const { error: docErr } = await supabase.from("contract_documents").insert({
    contract_id: contractId,
    file_name: file.name,
    storage_path: path,
    file_size: file.size,
    uploaded_by: userId,
  });
  if (docErr) throw new Error(docErr.message);
}

export async function createContract(form: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("contracts")
    .insert({ ...contractFromForm(form), created_by: user.id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const file = form.get("pdf");
  if (file instanceof File && file.size > 0) {
    await uploadPdf(supabase, data.id, file, user.id);
  }

  revalidatePath("/", "layout");
  redirect(`/kontrakter/${data.id}`);
}

export async function updateContract(id: string, form: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("contracts").update(contractFromForm(form)).eq("id", id);
  if (error) throw new Error(error.message);

  const file = form.get("pdf");
  if (file instanceof File && file.size > 0) {
    await uploadPdf(supabase, id, file, user.id);
  }

  revalidatePath("/", "layout");
  redirect(`/kontrakter/${id}`);
}

export async function deleteContract(id: string) {
  const supabase = createClient();

  // Slet filer i storage først
  const { data: docs } = await supabase
    .from("contract_documents")
    .select("storage_path")
    .eq("contract_id", id);
  if (docs?.length) {
    await supabase.storage.from("contracts").remove(docs.map((d) => d.storage_path));
  }

  const { error } = await supabase.from("contracts").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
  redirect("/kontrakter");
}

export async function getDocumentUrl(storagePath: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("contracts")
    .createSignedUrl(storagePath, 60 * 10);
  if (error || !data) throw new Error("Kunne ikke hente dokumentet");
  return data.signedUrl;
}
