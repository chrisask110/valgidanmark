import { NextResponse } from "next/server";
import { getDBPolls } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const polls = await getDBPolls();
    return NextResponse.json({ polls });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
