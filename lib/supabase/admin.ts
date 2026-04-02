import { createClient } from "@supabase/supabase-js";

// Admin client using service_role key - ONLY for server-side use
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
