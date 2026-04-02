import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import ProductManager from "./product-manager";
import "./admin.css";

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID;

  // Get tenant info
  const { data: tenant } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .single();

  // Get user's membership
  const { data: membership } = await supabase
    .from("user_tenants")
    .select("role")
    .eq("user_id", user.id)
    .eq("tenant_id", tenantId)
    .single();

  // Get products for this tenant (using admin client to bypass RLS)
  const adminClient = createAdminClient();
  const { data: products } = await adminClient
    .from("products")
    .select("*")
    .eq("tenant_id", tenantId);

  return (
    <div className="admin-container">
      <div className="admin-bg-orb admin-bg-orb-1" />
      <div className="admin-bg-orb admin-bg-orb-2" />

      <div className="admin-panel">
        <header className="admin-header">
          <div className="admin-header-left">
            <div className="admin-logo">
              <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
                <rect width="40" height="40" rx="12" fill="url(#gradAdmin)" />
                <path
                  d="M12 20L18 14L24 20L18 26Z"
                  fill="white"
                  fillOpacity="0.9"
                />
                <path
                  d="M18 14L24 20L30 14L24 8Z"
                  fill="white"
                  fillOpacity="0.6"
                />
                <defs>
                  <linearGradient
                    id="gradAdmin"
                    x1="0"
                    y1="0"
                    x2="40"
                    y2="40"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#6366f1" />
                    <stop offset="1" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <h1 className="admin-title">Panel de Administración</h1>
              <p className="admin-tenant-name">
                {tenant?.name || "Cargando..."}
              </p>
            </div>
          </div>
          <form action="/auth/signout" method="POST">
            <button type="submit" className="admin-signout-btn">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Cerrar Sesión
            </button>
          </form>
        </header>

        <div className="admin-grid">
          {/* User Info Card */}
          <div className="admin-card">
            <div className="admin-card-icon admin-card-icon-blue">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h3>Usuario</h3>
            <p className="admin-card-value">{user.email}</p>
            <span className="admin-card-badge">Autenticado</span>
          </div>

          {/* Tenant Info Card */}
          <div className="admin-card">
            <div className="admin-card-icon admin-card-icon-purple">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <h3>Tenant</h3>
            <p className="admin-card-value">{tenant?.name || "—"}</p>
            <span className="admin-card-badge admin-card-badge-purple">
              {tenant?.slug || "—"}
            </span>
          </div>

          {/* Role Info Card */}
          <div className="admin-card">
            <div className="admin-card-icon admin-card-icon-green">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h3>Rol</h3>
            <p className="admin-card-value" style={{ textTransform: "capitalize" }}>
              {membership?.role || "—"}
            </p>
            <span className="admin-card-badge admin-card-badge-green">
              Verificado
            </span>
          </div>
        </div>

        <div className="admin-info-box">
          <h3>🔒 Aislación por Tenant</h3>
          <p>
            Este panel está protegido con <strong>Row Level Security (RLS)</strong>.
            Solo los usuarios asociados al tenant <code>{tenant?.slug}</code> pueden
            ver esta información. Un usuario de otro tenant será redirigido a la
            página de acceso no autorizado.
          </p>
          <div className="admin-info-id">
            <span>Tenant ID:</span>
            <code>{tenantId}</code>
          </div>
          <div className="admin-info-id">
            <span>User ID:</span>
            <code>{user.id}</code>
          </div>
        </div>

        {/* Product Manager */}
        <ProductManager initialProducts={products || []} />
      </div>
    </div>
  );
}
