import { createAdminClient } from "@/lib/supabase/admin";
import StoreClient from "./store-client";
import "./store.css";

// ISR on-demand: this page is pre-rendered as static HTML.
// It only regenerates when revalidatePath("/") or revalidateTag("products")
// is called from admin actions, the MercadoPago webhook, or the /api/revalidate endpoint.

type Product = {
  id: string;
  tenant_id: string;
  name: string;
  price: number;
  image_urls?: string[];
};

export default async function StorePage() {
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID;

  // Fetch products server-side using admin client (bypasses RLS for pre-render)
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("tenant_id", tenantId);

  const products: Product[] = data || [];

  return (
    <div className="store-container">
      <div className="store-bg-orb store-bg-orb-1" />
      <div className="store-bg-orb store-bg-orb-2" />
      <StoreClient products={products} />
    </div>
  );
}
