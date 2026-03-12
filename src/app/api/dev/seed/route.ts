import { NextResponse } from "next/server";
import { runSeed } from "../../../../../prisma/seed-runner";

export async function POST(request: Request) {
  // This endpoint must never run in production because it wipes and reseeds
  // the database for development convenience.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  // The secret header prevents accidental or unauthorized seed execution
  // in local or shared non-production environments.
  const devSecret = request.headers.get("x-dev-secret");

  if (!devSecret || devSecret !== process.env.DEV_SEED_SECRET) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // Keep the route thin: validate environment and secret, then delegate
  // the actual seed work to the reusable Prisma seed runner.
  const seedResult = await runSeed();

  return NextResponse.json({
    ok: true,
    ...seedResult,
  });
}
