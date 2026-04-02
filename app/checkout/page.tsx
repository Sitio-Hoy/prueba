"use client";

import { useEffect, useState, useCallback } from "react";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import { useRouter } from "next/navigation";
import "./checkout.css";

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mpInitialized, setMpInitialized] = useState(false);
  const router = useRouter();

  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID!;

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Load cart and fetch MP public key + preference
  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (!savedCart) {
      router.push("/");
      return;
    }

    const parsedCart: CartItem[] = JSON.parse(savedCart);
    if (parsedCart.length === 0) {
      router.push("/");
      return;
    }
    setCart(parsedCart);

    async function init() {
      try {
        // 1. Get MP public key from tenant
        const keyRes = await fetch(`/api/tenant-config?tenantId=${tenantId}`);
        const keyData = await keyRes.json();

        if (!keyData.mp_public_key) {
          setError("Mercado Pago no está configurado para este sitio.");
          setLoading(false);
          return;
        }

        setPublicKey(keyData.mp_public_key);

        // 2. Initialize MercadoPago SDK
        initMercadoPago(keyData.mp_public_key, { locale: "es-AR" });
        setMpInitialized(true);

        // 3. Create preference
        const prefRes = await fetch("/api/create-preference", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: parsedCart, tenantId }),
        });
        const prefData = await prefRes.json();

        if (prefData.preferenceId && prefData.orderId) {
          setPreferenceId(prefData.preferenceId);
          setOrderId(prefData.orderId);
        } else {
          setError("Error al crear la preferencia de pago.");
        }
      } catch (err) {
        setError("Error al inicializar el checkout.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [tenantId, router]);

  const handleSubmit = useCallback(
    async (formData: unknown) => {
      setProcessing(true);
      setError(null);

      try {
        const res = await fetch("/api/process-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            formData,
            tenantId,
            cartItems: cart,
            orderId,
          }),
        });

        const data = await res.json();

        if (data.id) {
          // Clear cart
          localStorage.removeItem("cart");
          // Redirect to status page
          router.push(`/checkout/status?payment_id=${data.id}&status=${data.status}`);
        } else {
          setError(data.error || "Error al procesar el pago");
        }
      } catch (err) {
        setError("Error de conexión. Intentá de nuevo.");
        console.error(err);
      } finally {
        setProcessing(false);
      }
    },
    [cart, tenantId, router]
  );

  const handleError = useCallback((error: unknown) => {
    console.error("Payment Brick error:", error);
  }, []);

  return (
    <div className="checkout-container">
      <div className="checkout-bg-orb checkout-bg-orb-1" />
      <div className="checkout-bg-orb checkout-bg-orb-2" />

      <div className="checkout-content">
        {/* Header */}
        <header className="checkout-header">
          <button className="checkout-back" onClick={() => router.push("/")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Volver a la tienda
          </button>
        </header>

        <div className="checkout-layout">
          {/* Order Summary */}
          <aside className="checkout-summary">
            <h2>Resumen del pedido</h2>
            <div className="checkout-items">
              {cart.map((item) => (
                <div key={item.id} className="checkout-item">
                  <div>
                    <span className="checkout-item-name">{item.name}</span>
                    <span className="checkout-item-qty">x{item.quantity}</span>
                  </div>
                  <span className="checkout-item-price">
                    ${(item.price * item.quantity).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
            <div className="checkout-total">
              <span>Total</span>
              <span>${total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
            </div>
          </aside>

          {/* Payment Section */}
          <main className="checkout-payment">
            <h2>Método de pago</h2>

            {error && (
              <div className="checkout-error">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 4a.75.75 0 011.5 0v3a.75.75 0 01-1.5 0V5zM8 11a1 1 0 100-2 1 1 0 000 2z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {loading ? (
              <div className="checkout-loading">
                <div className="checkout-spinner" />
                <p>Preparando el checkout...</p>
              </div>
            ) : processing ? (
              <div className="checkout-loading">
                <div className="checkout-spinner" />
                <p>Procesando tu pago...</p>
              </div>
            ) : mpInitialized && preferenceId ? (
              <div className="checkout-brick-wrapper">
                <Payment
                  initialization={{
                    amount: total,
                    preferenceId: preferenceId,
                  }}
                  onSubmit={async (param) => {
                    await handleSubmit(param.formData);
                  }}
                  onError={handleError}
                  customization={{
                    paymentMethods: {
                      creditCard: "all",
                      debitCard: "all",
                      ticket: "all",
                      mercadoPago: "all",
                    } as any,
                    visual: {
                      style: {
                        theme: "dark" as any,
                      },
                    },
                  }}
                />
              </div>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}
