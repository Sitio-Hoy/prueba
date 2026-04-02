import { MercadoPagoConfig, Payment as MpPayment } from "mercadopago";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { formData, tenantId, cartItems, orderId } = body;

    if (!formData || !tenantId || !orderId) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    // Get tenant's MP access token
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("mp_access_token, resend_api_key")
      .eq("id", tenantId)
      .single();

    if (tenantError || !tenant?.mp_access_token) {
      return NextResponse.json(
        { error: "Mercado Pago no configurado" },
        { status: 400 }
      );
    }

    const mpClient = new MercadoPagoConfig({
      accessToken: tenant.mp_access_token,
    });

    const payment = new MpPayment(mpClient);

    // Calculate total
    const totalAmount = cartItems.reduce(
      (sum: number, item: { price: number; quantity: number }) =>
        sum + item.price * item.quantity,
      0
    );

    // Build payment body based on payment type
    const paymentBody: Record<string, unknown> = {
      transaction_amount: totalAmount,
      description: `Compra - ${cartItems.length} producto(s)`,
      payment_method_id: formData.payment_method_id,
    };

    // Card payment
    if (formData.token) {
      paymentBody.token = formData.token;
      paymentBody.installments = formData.installments || 1;
      paymentBody.payer = {
        email: formData.payer?.email,
        identification: formData.payer?.identification,
      };
      if (formData.issuer_id) {
        paymentBody.issuer_id = formData.issuer_id;
      }
    }

    // Other payment methods (transfer, cash, etc.)
    if (formData.payer && !formData.token) {
      paymentBody.payer = {
        email: formData.payer.email,
        first_name: formData.payer.first_name,
        last_name: formData.payer.last_name,
        identification: formData.payer.identification,
      };
    }

    const result = await payment.create({ body: paymentBody as any });

    console.log("🔍 Payment result status:", result.status);
    console.log("🔍 FormData payer email:", formData.payer?.email || "(no email in formData)");
    console.log("🔍 MP result payer email:", (result.payer as any)?.email || "(no email in result)");

    // Update existing order
    const payerEmailStr = formData.payer?.email || (result.payer as any)?.email || null;
    await supabaseAdmin
      .from("orders")
      .update({
        mp_payment_id: String(result.id),
        status: result.status,
        payer_email: payerEmailStr,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    // Send confirmation email if payment approved and we have Resend key
    // Try formData email first, fallback to MP result payer email (wallet payments)
    const payerEmail = formData.payer?.email || (result.payer as any)?.email;
    console.log("📧 Resolved payer email:", payerEmail || "(none)");
    console.log("📧 Has Resend key:", !!tenant.resend_api_key);

    if (
      (result.status === "approved" || result.status === "in_process" || result.status === "pending") &&
      payerEmail &&
      tenant.resend_api_key
    ) {
      try {
        const resend = new Resend(tenant.resend_api_key);

        const itemsHtml = cartItems
          .map(
            (item: { name: string; price: number; quantity: number }) =>
              `<tr>
                <td style="padding:8px 12px;border-bottom:1px solid #eee;">${item.name}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">$${(item.price * item.quantity).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
              </tr>`
          )
          .join("");

        const statusText =
          result.status === "approved"
            ? "✅ Pago aprobado"
            : result.status === "pending"
            ? "⏳ Pago pendiente"
            : "⏳ Pago en proceso";

        console.log(`📧 Sending confirmation email to: ${payerEmail}`);
        console.log(`📧 Payment status: ${result.status}, Payment ID: ${result.id}`);

        const emailResult = await resend.emails.send({
          from: "Tienda <contacto@sitiohoy.com.ar>",
          to: [payerEmail],
          subject: `${statusText} - Orden #${result.id}`,
          html: `
            <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
              <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 24px;text-align:center;">
                <h1 style="color:#ffffff;margin:0;font-size:22px;">Confirmación de Compra</h1>
              </div>
              <div style="padding:24px;">
                <p style="color:#374151;font-size:16px;margin:0 0 8px;">¡Hola!</p>
                <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 20px;">
                  Recibimos tu pago correctamente. Acá tenés el detalle de tu compra:
                </p>
                <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:20px;">
                  <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Estado del pago</p>
                  <p style="margin:0;font-size:16px;font-weight:600;color:#111827;">${statusText}</p>
                </div>
                <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;">
                  <thead>
                    <tr style="background:#f3f4f6;">
                      <th style="padding:8px 12px;text-align:left;">Producto</th>
                      <th style="padding:8px 12px;text-align:center;">Cant.</th>
                      <th style="padding:8px 12px;text-align:right;">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>${itemsHtml}</tbody>
                </table>
                <div style="margin-top:16px;padding:12px;background:#f3f4f6;border-radius:8px;display:flex;justify-content:space-between;">
                  <span style="font-size:16px;font-weight:700;color:#111827;">Total</span>
                  <span style="font-size:16px;font-weight:700;color:#6366f1;">$${totalAmount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                </div>
                <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;text-align:center;">
                  ID de pago: ${result.id}
                </p>
              </div>
            </div>
          `,
        });

        console.log("📧 Resend response:", JSON.stringify(emailResult, null, 2));

        if (emailResult.error) {
          console.error("❌ Email failed:", emailResult.error);
        } else {
          console.log(`✅ Email sent successfully! Resend ID: ${emailResult.data?.id}`);
        }
      } catch (emailError) {
        console.error("❌ Error sending email:", emailError);
        // Don't fail the payment if email fails
      }
    }

    return NextResponse.json({
      id: result.id,
      status: result.status,
      status_detail: result.status_detail,
      payment_method_id: result.payment_method_id,
    });
  } catch (error: any) {
    console.error("Error processing payment:", error);
    return NextResponse.json(
      {
        error: "Error al procesar el pago",
        detail: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
