import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// One-time setup endpoint. Hit GET /api/setup-db to create tables.
// Uses service_role key so it bypasses RLS and can create tables.
export async function GET() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const results: { step: string; status: string; error?: string }[] = [];

  const queries = [
    {
      name: "Create tenants table",
      sql: `CREATE TABLE IF NOT EXISTS public.tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      );`,
    },
    {
      name: "Create user_tenants table",
      sql: `CREATE TABLE IF NOT EXISTS public.user_tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
        role TEXT DEFAULT 'admin',
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(user_id, tenant_id)
      );`,
    },
    {
      name: "Enable RLS on tenants",
      sql: `ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;`,
    },
    {
      name: "Enable RLS on user_tenants",
      sql: `ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;`,
    },
    {
      name: "Create tenant view policy",
      sql: `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their tenants' AND tablename = 'tenants') THEN
          CREATE POLICY "Users can view their tenants" ON public.tenants FOR SELECT TO authenticated
          USING (id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = (SELECT auth.uid())));
        END IF;
      END $$;`,
    },
    {
      name: "Create membership view policy",
      sql: `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their tenant memberships' AND tablename = 'user_tenants') THEN
          CREATE POLICY "Users can view their tenant memberships" ON public.user_tenants FOR SELECT TO authenticated
          USING ((SELECT auth.uid()) = user_id);
        END IF;
      END $$;`,
    },
    {
      name: "Insert tenant",
      sql: `INSERT INTO public.tenants (id, name, slug) VALUES ('aa007e26-b392-45d7-8d28-513493002cb8', 'Sitio Prueba 1', 'prueba1') ON CONFLICT (id) DO NOTHING;`,
    },
  ];

  for (const q of queries) {
    const { error } = await supabaseAdmin.rpc("", {} as never).then(
      () => ({ error: null }),
      (err) => ({ error: err })
    );

    // Use the postgres endpoint via fetch
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`,
        {
          method: "POST",
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: q.sql }),
        }
      );

      if (res.ok) {
        results.push({ step: q.name, status: "✅ OK" });
      } else {
        const body = await res.text();
        results.push({
          step: q.name,
          status: "⚠️ Check manually",
          error: body,
        });
      }
    } catch (err: unknown) {
      results.push({
        step: q.name,
        status: "❌ Error",
        error: String(err),
      });
    }
  }

  return NextResponse.json({
    message:
      "Database setup attempted. If steps show errors, please run the SQL manually in Supabase SQL Editor.",
    results,
    manual_sql: queries.map((q) => q.sql).join("\n\n"),
  });
}
