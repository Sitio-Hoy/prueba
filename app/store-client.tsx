"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Product = {
  id: string;
  tenant_id: string;
  name: string;
  price: number;
  image_urls?: string[];
};

type CartItem = Product & { quantity: number };

export default function StoreClient({ products }: { products: Product[] }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    // Load cart from localStorage
    const saved = localStorage.getItem("cart");
    if (saved) {
      try {
        setCart(JSON.parse(saved));
      } catch {}
    }
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setCartOpen(true);
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  }

  function updateQuantity(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === productId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      {/* Header */}
      <header className="store-header">
        <div className="store-header-left">
          <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="12" fill="url(#gradStore)" />
            <path d="M12 20L18 14L24 20L18 26Z" fill="white" fillOpacity="0.9" />
            <path d="M18 14L24 20L30 14L24 8Z" fill="white" fillOpacity="0.6" />
            <defs>
              <linearGradient id="gradStore" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366f1" />
                <stop offset="1" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
          <h1 className="store-brand">Tienda</h1>
        </div>
        <div className="store-header-right">
          <button
            className="store-cart-btn"
            onClick={() => setCartOpen(!cartOpen)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
            </svg>
            {cartCount > 0 && (
              <span className="store-cart-badge">{cartCount}</span>
            )}
          </button>
          <Link href="/login" className="store-login-link">
            Admin
          </Link>
        </div>
      </header>

      {/* Products Grid */}
      <main className="store-main">
        <h2 className="store-section-title">Productos</h2>
        {products.length === 0 ? (
          <div className="store-empty">
            <p>No hay productos disponibles.</p>
            <p className="store-empty-hint">
              Agregá productos desde el panel de administración.
            </p>
          </div>
        ) : (
          <div className="store-grid">
            {products.map((product) => (
              <div key={product.id} className="store-product-card">
                <div className="store-product-img">
                  {product.image_urls && product.image_urls.length > 0 ? (
                    <img 
                      src={product.image_urls[0]} 
                      alt={product.name} 
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.3">
                      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                      <line x1="12" y1="22.08" x2="12" y2="12" />
                    </svg>
                  )}
                </div>
                <div className="store-product-info">
                  <h3>{product.name}</h3>
                  <p className="store-product-price">
                    ${product.price.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <button
                  className="store-add-btn"
                  onClick={() => addToCart(product)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Agregar
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Cart Sidebar */}
      <div className={`store-cart-overlay ${cartOpen ? "open" : ""}`} onClick={() => setCartOpen(false)} />
      <aside className={`store-cart ${cartOpen ? "open" : ""}`}>
        <div className="store-cart-header">
          <h2>Carrito</h2>
          <button className="store-cart-close" onClick={() => setCartOpen(false)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="store-cart-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.3">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
            </svg>
            <p>Tu carrito está vacío</p>
          </div>
        ) : (
          <>
            <div className="store-cart-items">
              {cart.map((item) => (
                <div key={item.id} className="store-cart-item">
                  <div className="store-cart-item-info">
                    <h4>{item.name}</h4>
                    <p>${(item.price * item.quantity).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="store-cart-item-controls">
                    <button onClick={() => updateQuantity(item.id, -1)}>−</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)}>+</button>
                    <button className="store-cart-remove" onClick={() => removeFromCart(item.id)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="store-cart-footer">
              <div className="store-cart-total">
                <span>Total</span>
                <span>${cartTotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
              </div>
              <button
                className="store-checkout-btn"
                onClick={() => {
                  setCartOpen(false);
                  window.location.href = "/checkout";
                }}
              >
                Finalizar Compra
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
