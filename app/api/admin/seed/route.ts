import { NextRequest, NextResponse } from "next/server";
import { seedFromFallback, getPollCount } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/seed
 * Seeds the DB with FALLBACK_POLLS.  Call this once after deploying.
 * Protected by the same ADMIN_PASSWORD used in middleware (passed as Bearer token).
 *
 * curl -X POST https://your-site.vercel.app/api/admin/seed \
 *   -H "Authorization: Bearer YOUR_ADMIN_PASSWORD"
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expectedPass = process.env.ADMIN_PASSWORD ?? "changeme";
  if (auth !== `Bearer ${expectedPass}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const before = await getPollCount();
  const inserted = await seedFromFallback();
  const after = await getPollCount();

  return NextResponse.json({ ok: true, inserted, before, after });
}
