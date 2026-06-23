import { NextResponse } from "next/server";
import { getAllStrategies } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const strategies = await getAllStrategies();
    return NextResponse.json(strategies);
  } catch (error) {
    console.error("Failed to fetch strategies:", error);
    return NextResponse.json(
      { error: "Failed to fetch strategies" },
      { status: 500 }
    );
  }
}
