"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createCategory(form: FormData) {
  const supabase = createClient();
  const { error } = await supabase
    .from("categories")
    .insert({ name: form.get("name")!.toString().trim() });
  if (error) throw new Error(error.message);
  revalidatePath("/kategorier");
}

export async function deleteCategory(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw new Error("Kategorien er i brug og kan ikke slettes");
  revalidatePath("/kategorier");
}
