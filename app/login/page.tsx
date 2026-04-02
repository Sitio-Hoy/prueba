"use client";

import { useState } from "react";
import { login, signup } from "./actions";
import "./login.css";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData, action: "login" | "signup") {
    setIsLoading(true);
    setError(null);
    try {
      const result =
        action === "login" ? await login(formData) : await signup(formData);
      if (result?.error) {
        setError(result.error);
      }
    } catch {
      // redirect throws, which is expected
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-bg-orb login-bg-orb-1" />
      <div className="login-bg-orb login-bg-orb-2" />
      <div className="login-bg-orb login-bg-orb-3" />

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="12" fill="url(#grad)" />
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
                  id="grad"
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
          <h1 className="login-title">Panel de Admin</h1>
          <p className="login-subtitle">
            Ingresá con tu cuenta para acceder al panel
          </p>
        </div>

        {error && (
          <div className="login-error">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 4a.75.75 0 011.5 0v3a.75.75 0 01-1.5 0V5zM8 11a1 1 0 100-2 1 1 0 000 2z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form className="login-form">
          <div className="login-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="tu@email.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required

              autoComplete="current-password"
            />
          </div>

          <div className="login-actions">
            <button
              type="submit"
              className="login-btn login-btn-primary"
              disabled={isLoading}
              formAction={(formData) => handleSubmit(formData, "login")}
            >
              {isLoading ? (
                <span className="login-spinner" />
              ) : (
                "Iniciar Sesión"
              )}
            </button>
            <button
              type="submit"
              className="login-btn login-btn-secondary"
              disabled={isLoading}
              formAction={(formData) => handleSubmit(formData, "signup")}
            >
              Crear Cuenta
            </button>
          </div>
        </form>

        <div className="login-footer">
          <p>Sistema Multi-Tenant · Acceso restringido por sitio</p>
        </div>
      </div>
    </div>
  );
}
