// Database setup script - run once to create tables and policies
// Usage: node scripts/setup-db.mjs

const SUPABASE_URL = "https://suvpddgmhyjmixvcbpqc.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1dnBkZGdtaHlqbWl4dmNicHFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDcyNTY4MCwiZXhwIjoyMDkwMzAxNjgwfQ.64SvSnVxKlQTTdsECudEL6N_BoFx0zq7phZLmz_C6Ik";
const TENANT_ID = "aa007e26-b392-45d7-8d28-513493002cb8";

async function runSQL(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  // Using the SQL endpoint instead
  const sqlRes = await fetch(`${SUPABASE_URL}/pg`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  return sqlRes;
}

async function setup() {
  console.log("🔧 Setting up database...\n");

  // Use the Supabase Management API to execute SQL
  // Since we can't directly run SQL via REST, we'll use the pg endpoint

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
      sql: `INSERT INTO public.tenants (id, name, slug) VALUES ('${TENANT_ID}', 'Sitio Prueba 1', 'prueba1') ON CONFLICT (id) DO NOTHING;`,
    },
  ];

  // Try using the Supabase SQL API (requires service_role)
  for (const q of queries) {
    console.log(`  ⏳ ${q.name}...`);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/rpc/`,
        {
          method: "POST",
          headers: {
            apikey: SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({}),
        }
      );
    } catch (e) {
      // Expected - we'll use the SQL file approach
    }
  }

  console.log("\n⚠️  The REST API cannot execute DDL statements directly.");
  console.log("📋 Please run the following SQL in the Supabase SQL Editor:\n");
  console.log("━".repeat(60));
  console.log(queries.map((q) => q.sql).join("\n\n"));
  console.log("\n━".repeat(60));
  console.log(`\n✅ Then your database will be ready!`);
}

setup().catch(console.error);
