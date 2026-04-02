import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Returns tenant's MP public key (safe to expose to client)
export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get("tenantId");

  if (!tenantId) {
    return NextResponse.json({ error: "tenantId required" }, { status: 400 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabaseAdmin
    .from("tenants")
    .select("mp_public_key")
    .eq("id", tenantId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  return NextResponse.json({ mp_public_key: data.mp_public_key });
}
