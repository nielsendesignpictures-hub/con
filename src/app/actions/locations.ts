"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createLocation(form: FormData) {
  const supabase = createClient();
  const { error } = await supabase.from("locations").insert({
    name: form.get("name")!.toString().trim(),
    cvr: form.get("cvr")!.toString().trim(),
    address: form.get("address")?.toString().trim() || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/lokationer");
}

export async function updateLocation(id: string, form: FormData) {
  const supabase = createClient();
  const { error } = await supabase
    .from("locations")
    .update({
      name: form.get("name")!.toString().trim(),
      cvr: form.get("cvr")!.toString().trim(),
      address: form.get("address")?.toString().trim() || null,
      active: form.get("active") === "on",
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/lokationer");
}
