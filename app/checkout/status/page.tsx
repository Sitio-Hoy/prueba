"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import "./status.css";

function StatusContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const paymentId = searchParams.get("payment_id");

  const statusConfig: Record<string, { icon: string; title: string; message: string; color: string }> = {
    approved: {
      icon: "✅",
      title: "¡Pago aprobado!",
      message: "Tu compra fue procesada exitosamente.",
      color: "#22c55e",
    },
    pending: {
      icon: "⏳",
      title: "Pago pendiente",
      message: "Tu pago está siendo procesado. Te notificaremos cuando se confirme.",
      color: "#f59e0b",
    },
    in_process: {
      icon: "⏳",
      title: "Pago en proceso",
      message: "Tu pago está siendo revisado. Esto puede tardar unos minutos.",
      color: "#f59e0b",
    },
    rejected: {
      icon: "❌",
      title: "Pago rechazado",
      message: "No pudimos procesar tu pago. Intentá con otro medio de pago.",
      color: "#ef4444",
    },
  };

  const config = statusConfig[status || ""] || {
    icon: "ℹ️",
    title: "Estado del pago",
    message: "Verificá el estado de tu pago.",
    color: "#6366f1",
  };

  return (
    <div className="status-container">
      <div className="status-bg-orb status-bg-orb-1" />

      <div className="status-card">
        <div className="status-icon" style={{ background: `${config.color}20` }}>
          <span style={{ fontSize: "40px" }}>{config.icon}</span>
        </div>

        <h1 className="status-title">{config.title}</h1>
        <p className="status-message">{config.message}</p>

        {paymentId && (
          <div className="status-detail">
            <span>ID de pago:</span>
            <code>{paymentId}</code>
          </div>
        )}

        <div className="status-actions">
          <Link href="/" className="status-btn status-btn-primary">
            Volver a la tienda
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function StatusPage() {
  return (
    <Suspense
      fallback={
        <div className="status-container">
          <div className="status-card">
            <p style={{ color: "rgba(255,255,255,0.5)" }}>Cargando...</p>
          </div>
        </div>
      }
    >
      <StatusContent />
    </Suspense>
  );
}
