"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/admin");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID;

  // Sign up the user
  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // Assign user to the current tenant using admin client (bypasses RLS)
  if (authData.user && tenantId) {
    const { error: tenantError } = await adminClient
      .from("user_tenants")
      .insert({
        user_id: authData.user.id,
        tenant_id: tenantId,
        role: "admin",
      });

    if (tenantError) {
      console.error("Error assigning tenant:", tenantError);
    }
  }

  revalidatePath("/", "layout");
  redirect("/admin");
}
