import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MercadoPagoConfig, Payment as MpPayment } from "mercadopago";
import { Resend } from "resend";
import { revalidatePath } from "next/cache";

// Mercado Pago webhook for payment status updates
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.type === "payment" && body.data?.id) {
      const paymentId = body.data.id;
      const tenantId = request.nextUrl.searchParams.get("tenantId");

      if (!tenantId) {
        console.error("Webhook missing tenantId");
        return NextResponse.json({ received: true });
      }

      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: tenant } = await supabaseAdmin
        .from("tenants")
        .select("mp_access_token, resend_api_key")
        .eq("id", tenantId)
        .single();

      if (tenant?.mp_access_token) {
        const mpClient = new MercadoPagoConfig({
          accessToken: tenant.mp_access_token,
        });

        const paymentApi = new MpPayment(mpClient);
        const payment = await paymentApi.get({ id: paymentId });
        
        const orderId = payment.external_reference;
        const payerEmailStr = (payment.payer as any)?.email;

        if (orderId) {
          // Find if we already approved this order to prevent duplicate emails
          const { data: existingOrder } = await supabaseAdmin
            .from("orders")
            .select("status, items, total")
            .eq("id", orderId)
            .single();

          if (existingOrder && existingOrder.status !== "approved" && payment.status === "approved") {
            // It just got approved! Let's send the email if possible
            if (tenant.resend_api_key && payerEmailStr) {
               try {
                 const resend = new Resend(tenant.resend_api_key);
                 const itemsHtml = (existingOrder.items as any[])
                    .map(
                      (item: { name: string; price: number; quantity: number }) =>
                        `<tr>
                          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${item.name}</td>
                          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
                          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">$${(item.price * item.quantity).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                        </tr>`
                    )
                    .join("");
                    
                 await resend.emails.send({
                    from: "Tienda <contacto@sitiohoy.com.ar>",
                    to: [payerEmailStr],
                    subject: `✅ Pago aprobado - Orden #${payment.id}`,
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
                            <span style="font-size:16px;font-weight:700;color:#6366f1;">$${Number(existingOrder.total).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                          </div>
                          <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;text-align:center;">
                            ID de pago: ${payment.id}
                          </p>
                        </div>
                      </div>
                    `,
                  });
                  console.log(`✅ Webhook sent confirmation email to ${payerEmailStr}`);
               } catch (e) {
                 console.error("Webhook email error:", e);
               }
            }
          }

          // Update order status and details in DB
          const updateData: any = { 
            status: payment.status, 
            mp_payment_id: String(paymentId),
            updated_at: new Date().toISOString()
          };
          if (payerEmailStr) {
             updateData.payer_email = payerEmailStr;
          }

          await supabaseAdmin
            .from("orders")
            .update(updateData)
            .eq("id", orderId);

          // Invalidate storefront cache after order status change
          revalidatePath("/");
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ received: true });
  }
}
