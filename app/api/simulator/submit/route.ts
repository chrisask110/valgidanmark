import { NextRequest, NextResponse } from "next/server";
import { insertSimulatorSubmission } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pmParty, governmentParties, supportParties, coalitionSeats, hasMajority } = body;

    if (
      typeof pmParty !== "string" ||
      !Array.isArray(governmentParties) ||
      !Array.isArray(supportParties) ||
      typeof coalitionSeats !== "number" ||
      typeof hasMajority !== "boolean"
    ) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await insertSimulatorSubmission({
      pmParty,
      governmentParties,
      supportParties,
      coalitionSeats,
      hasMajority,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[simulator/submit]", err);
    // Still return 200 — client is fire-and-forget, don't alarm user
    return NextResponse.json({ ok: false });
  }
}
