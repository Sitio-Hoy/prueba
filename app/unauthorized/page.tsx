import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0f",
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        padding: "20px",
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: "440px",
          padding: "48px 40px",
          background: "rgba(255,255,255,0.04)",
          borderRadius: "24px",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div
          style={{
            width: "64px",
            height: "64px",
            background: "rgba(239,68,68,0.12)",
            borderRadius: "20px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "24px",
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#f87171"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
        </div>
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 700,
            color: "#ffffff",
            margin: "0 0 8px",
          }}
        >
          Acceso No Autorizado
        </h1>
        <p
          style={{
            fontSize: "15px",
            color: "rgba(255,255,255,0.5)",
            lineHeight: 1.6,
            margin: "0 0 28px",
          }}
        >
          Tu cuenta no tiene permisos para acceder al panel de este sitio.
          Contactá al administrador si creés que es un error.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <Link
            href="/login"
            style={{
              padding: "10px 24px",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff",
              borderRadius: "12px",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            Volver al Login
          </Link>
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              style={{
                padding: "10px 24px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.6)",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Cerrar Sesión
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
