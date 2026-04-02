import { NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

/**
 * On-demand ISR revalidation endpoint.
 * Protected by a secret token to prevent unauthorized cache purging.
 *
 * Usage:
 *   GET /api/revalidate?secret=TOKEN&path=/
 *   GET /api/revalidate?secret=TOKEN&tag=products
 *   GET /api/revalidate?secret=TOKEN&path=/&tag=products  (both)
 */
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");

  if (secret !== process.env.REVALIDATION_SECRET) {
    return Response.json(
      { revalidated: false, message: "Invalid secret" },
      { status: 401 }
    );
  }

  const path = request.nextUrl.searchParams.get("path");
  const tag = request.nextUrl.searchParams.get("tag");

  if (!path && !tag) {
    return Response.json(
      {
        revalidated: false,
        message: "Missing 'path' or 'tag' query parameter",
      },
      { status: 400 }
    );
  }

  try {
    if (path) {
      revalidatePath(path);
    }
    if (tag) {
      // Use { expire: 0 } for external/webhook calls to expire immediately
      revalidateTag(tag, { expire: 0 });
    }

    return Response.json({
      revalidated: true,
      path: path || null,
      tag: tag || null,
      now: Date.now(),
    });
  } catch (error) {
    console.error("Revalidation error:", error);
    return Response.json(
      { revalidated: false, message: "Error revalidating" },
      { status: 500 }
    );
  }
}
