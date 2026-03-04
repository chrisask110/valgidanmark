import { NextResponse } from "next/server";
import { getSimulatorStats } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getSimulatorStats();
    return NextResponse.json(stats);
  } catch (err) {
    console.error("[simulator/stats]", err);
    return NextResponse.json({ total: 0, withMajority: 0, byPM: [] });
  }
}
