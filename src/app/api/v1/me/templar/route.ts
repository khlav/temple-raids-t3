import { NextResponse } from "next/server";
import { z } from "zod";
import { validateApiToken } from "~/server/api/v1-auth";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";

const PatchSchema = z.object({
  enabled: z.boolean(),
});

export async function PATCH(request: Request) {
  try {
    const authResult = await validateApiToken(request);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    await db
      .update(users)
      .set({ templarEnabled: parsed.data.enabled })
      .where(eq(users.id, user.id));

    const updated = await db
      .select({
        id: users.id,
        name: users.name,
        image: users.image,
        isRaidManager: users.isRaidManager,
        isAdmin: users.isAdmin,
        templarEnabled: users.templarEnabled,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    const u = updated[0]!;
    return NextResponse.json({
      id: u.id,
      name: u.name,
      image: u.image,
      isRaidManager: u.isRaidManager,
      isAdmin: u.isAdmin,
      templarEnabled: u.templarEnabled ?? false,
    });
  } catch (error) {
    console.error("v1 API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
