import { NextResponse } from "next/server";
import { getPolls } from "@/lib/db";

// Never statically cache — always serve fresh data from DB
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const polls = await getPolls();
    return NextResponse.json({ polls }, { status: 200 });
  } catch (err) {
    console.error("[api/polls] error:", err);
    return NextResponse.json({ error: "Failed to fetch polls" }, { status: 500 });
  }
}
