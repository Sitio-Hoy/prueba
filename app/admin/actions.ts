"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath, revalidateTag } from "next/cache";

export async function createProduct(formData: FormData) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID;

  const name = formData.get("name") as string;
  const price = parseFloat(formData.get("price") as string);
  const imageUrlsRaw = formData.get("image_urls") as string | null;
  let image_urls: string[] | null = null;
  if (imageUrlsRaw) {
    try {
      image_urls = JSON.parse(imageUrlsRaw);
    } catch (e) {}
  }

  if (!name || isNaN(price)) {
    return { error: "Nombre y precio son requeridos" };
  }

  const { error } = await adminClient.from("products").insert({
    name,
    price,
    tenant_id: tenantId,
    image_urls,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin");
  revalidatePath("/");
  revalidateTag("products", "max");
  return { success: true };
}

export async function updateProduct(formData: FormData) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const price = parseFloat(formData.get("price") as string);
  const imageUrlsRaw = formData.get("image_urls") as string | null;
  let image_urls: string[] | null = null;
  if (imageUrlsRaw) {
    try {
      image_urls = JSON.parse(imageUrlsRaw);
    } catch (e) {}
  }

  if (!id || !name || isNaN(price)) {
    return { error: "Datos inválidos" };
  }

  const updateData: any = { name, price };
  if (image_urls) {
    updateData.image_urls = image_urls;
  }

  const { error } = await adminClient
    .from("products")
    .update(updateData)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin");
  revalidatePath("/");
  revalidateTag("products", "max");
  return { success: true };
}

export async function deleteProduct(formData: FormData) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const id = formData.get("id") as string;

  const { error } = await adminClient
    .from("products")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin");
  revalidatePath("/");
  revalidateTag("products", "max");
  return { success: true };
}
