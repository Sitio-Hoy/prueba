import { MercadoPagoConfig, Preference } from "mercadopago";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const { items, tenantId } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    // Get tenant's MP access token from DB
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("mp_access_token")
      .eq("id", tenantId)
      .single();

    if (tenantError || !tenant?.mp_access_token) {
      return NextResponse.json(
        { error: "Mercado Pago no configurado para este tenant" },
        { status: 400 }
      );
    }

    // Initialize MercadoPago with tenant's access token
    const mpClient = new MercadoPagoConfig({
      accessToken: tenant.mp_access_token,
    });
    
    const preference = new Preference(mpClient);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL; // e.g., ngrok for webhooks
    const isLocalhost = !siteUrl || siteUrl.includes("localhost");

    // Create pending order
    const totalAmount = items.reduce((sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity, 0);
    
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        tenant_id: tenantId,
        status: "created",
        total: totalAmount,
        items,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Error creando orden base" }, { status: 500 });
    }

    const preferenceBody: Record<string, unknown> = {
      external_reference: order.id,
      items: items.map((item: { id: string; name: string; price: number; quantity: number }) => ({
        id: item.id,
        title: item.name,
        unit_price: item.price,
        quantity: item.quantity,
        currency_id: "ARS",
      })),
    };

    if (siteUrl && !isLocalhost) {
      // User requested EVERYTHING to go to ngrok
      preferenceBody.back_urls = {
        success: `${siteUrl}/checkout/status`,
        failure: `${siteUrl}/checkout/status`,
        pending: `${siteUrl}/checkout/status`,
      };
      preferenceBody.auto_return = "approved";
      preferenceBody.notification_url = `${siteUrl}/api/webhooks/mercadopago?tenantId=${tenantId}`;
    }

    const result = await preference.create({
      body: preferenceBody as any,
    });

    return NextResponse.json({
      preferenceId: result.id,
      initPoint: result.init_point,
      orderId: order.id,
    });
  } catch (error) {
    console.error("Error creating preference:", error);
    return NextResponse.json(
      { error: "Error al crear la preferencia de pago" },
      { status: 500 }
    );
  }
}
