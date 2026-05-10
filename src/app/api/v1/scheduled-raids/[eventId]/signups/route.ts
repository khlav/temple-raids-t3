import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { logger } from "~/lib/logger";
import { validateApiToken } from "~/server/api/v1-auth";
import { matchSignupsToCharacters } from "~/server/api/helpers/match-signups";
import { env } from "~/env";
import { db } from "~/server/db";
import {
  trackedRaidsL6LockoutWk,
  primaryRaidAttendeeAndBenchMap,
  primaryRaidAttendanceL6LockoutWk,
} from "~/server/db/schema";

const RAID_HELPER_API_BASE = "https://raid-helper.xyz/api";

interface RaidHelperSignup {
  userId: string;
  name: string;
  className: string;
  specName: string;
  roleName: string;
  status: string;
}

interface RaidHelperEventResponse {
  id: string;
  startTime: number;
  signUps?: RaidHelperSignup[];
  lastEventId?: string;
}

export async function GET(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const authResult = await validateApiToken(request);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    if (!user.isRaidManager) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { eventId } = await params;
    if (!eventId || eventId.includes("/") || eventId.length > 64) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    // 1. Fetch event from Raid Helper, resolve recurring events via lastEventId
    const initialRes = await fetch(`${RAID_HELPER_API_BASE}/v4/events/${eventId}`, {
      headers: { Authorization: env.RAID_HELPER_API_KEY },
    });

    if (initialRes.status === 404) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (!initialRes.ok) {
      return NextResponse.json({ error: "Raid Helper API unavailable" }, { status: 502 });
    }

    const initialData = (await initialRes.json()) as Record<string, unknown>;

    const actualEventId =
      !initialData.signUps && initialData.lastEventId
        ? (initialData.lastEventId as string)
        : eventId;

    let eventData: RaidHelperEventResponse;
    if (actualEventId !== eventId) {
      const resolvedRes = await fetch(`${RAID_HELPER_API_BASE}/v4/events/${actualEventId}`, {
        headers: { Authorization: env.RAID_HELPER_API_KEY },
      });
      if (!resolvedRes.ok) {
        return NextResponse.json({ error: "Raid Helper API unavailable" }, { status: 502 });
      }
      eventData = (await resolvedRes.json()) as RaidHelperEventResponse;
    } else {
      eventData = initialData as unknown as RaidHelperEventResponse;
    }

    const rawSignups: RaidHelperSignup[] = eventData.signUps ?? [];

    // 2. Match signups to DB characters
    const matchResults = await matchSignupsToCharacters(
      db,
      rawSignups.map((s) => ({
        userId: s.userId,
        discordName: s.name,
        className: s.className,
        specName: s.specName,
        partyId: null,
        slotId: null,
      })),
    );

    // 3. Collect primary character IDs for batch attendance fetch
    const primaryIdSet = new Set<number>();
    for (const result of matchResults) {
      const primaryId =
        result.matchedCharacter !== undefined
          ? (result.matchedCharacter.primaryCharacterId ?? result.matchedCharacter.characterId)
          : (result.matchedPrimaryCharacterId ?? null);
      if (primaryId !== null && primaryId !== undefined) {
        primaryIdSet.add(primaryId);
      }
    }
    const primaryIdList = [...primaryIdSet];

    // 4. Batch attendance — 3 parallel queries regardless of signup count
    const [allL6Raids, summaryRows, attendanceRows] = await Promise.all([
      db
        .select({
          raidId: trackedRaidsL6LockoutWk.raidId,
          name: trackedRaidsL6LockoutWk.name,
          date: trackedRaidsL6LockoutWk.date,
          zone: trackedRaidsL6LockoutWk.zone,
          attendanceWeight: trackedRaidsL6LockoutWk.attendanceWeight,
        })
        .from(trackedRaidsL6LockoutWk)
        .orderBy(trackedRaidsL6LockoutWk.date),
      primaryIdList.length === 0
        ? Promise.resolve([])
        : db
            .select({
              characterId: primaryRaidAttendanceL6LockoutWk.characterId,
              weightedAttendancePct: primaryRaidAttendanceL6LockoutWk.weightedAttendancePct,
              weightedRaidTotal: primaryRaidAttendanceL6LockoutWk.weightedRaidTotal,
            })
            .from(primaryRaidAttendanceL6LockoutWk)
            .where(inArray(primaryRaidAttendanceL6LockoutWk.characterId, primaryIdList)),
      primaryIdList.length === 0
        ? Promise.resolve([])
        : db
            .select({
              raidId: primaryRaidAttendeeAndBenchMap.raidId,
              primaryCharacterId: primaryRaidAttendeeAndBenchMap.primaryCharacterId,
              attendeeOrBench: primaryRaidAttendeeAndBenchMap.attendeeOrBench,
            })
            .from(primaryRaidAttendeeAndBenchMap)
            .where(inArray(primaryRaidAttendeeAndBenchMap.primaryCharacterId, primaryIdList)),
    ]);

    // 5. Build lookup maps for in-memory join
    const summaryMap = new Map(summaryRows.map((r) => [r.characterId, r]));

    const characterRaidStatus = new Map<number, Map<number, string | null>>();
    for (const row of attendanceRows) {
      if (row.primaryCharacterId === null || row.raidId === null) continue;
      if (!characterRaidStatus.has(row.primaryCharacterId)) {
        characterRaidStatus.set(row.primaryCharacterId, new Map());
      }
      characterRaidStatus.get(row.primaryCharacterId)!.set(row.raidId, row.attendeeOrBench);
    }

    function buildAttendance(primaryId: number) {
      const summary = summaryMap.get(primaryId);
      const statusMap = characterRaidStatus.get(primaryId) ?? new Map<number, string | null>();
      return {
        attendancePct: summary?.weightedAttendancePct ?? 0,
        weeksTracked: summary?.weightedRaidTotal ?? 0,
        raids: allL6Raids.map((raid) => ({
          raidId: raid.raidId,
          name: raid.name,
          date: raid.date,
          zone: raid.zone,
          attendanceWeight: raid.attendanceWeight,
          attendeeOrBench: (statusMap.get(raid.raidId!) ?? null) as "attendee" | "bench" | null,
        })),
      };
    }

    // 6. Assemble response
    const rawSignupMap = new Map(rawSignups.map((s) => [s.userId, s]));

    const signups = matchResults.map((result) => {
      const raw = rawSignupMap.get(result.userId);

      const effectivePrimaryId =
        result.matchedCharacter !== undefined
          ? (result.matchedCharacter.primaryCharacterId ?? result.matchedCharacter.characterId)
          : (result.matchedPrimaryCharacterId ?? null);

      let character: {
        id: number | null;
        name: string | null;
        class: string | null;
        primaryCharacterId: number | null;
        attendance: ReturnType<typeof buildAttendance>;
      } | null = null;

      if (result.matchedCharacter !== undefined) {
        character = {
          id: result.matchedCharacter.characterId,
          name: result.matchedCharacter.characterName,
          class: result.matchedCharacter.characterClass,
          primaryCharacterId: result.matchedCharacter.primaryCharacterId,
          attendance: buildAttendance(effectivePrimaryId!),
        };
      } else if (effectivePrimaryId !== null) {
        // Ambiguous match — include family attendance with best-guess primary info
        character = {
          id: null,
          name: result.matchedPrimaryCharacterName ?? null,
          class: null,
          primaryCharacterId: effectivePrimaryId,
          attendance: buildAttendance(effectivePrimaryId),
        };
      }

      return {
        userId: result.userId,
        discordName: result.discordName,
        className: result.className,
        specName: result.specName,
        roleName: raw?.roleName ?? "",
        status: raw?.status ?? "",
        matchStatus: result.status,
        matchConfidence: result.confidence ?? null,
        character,
      };
    });

    return NextResponse.json({
      event: {
        id: eventId,
        resolvedId: actualEventId,
        startTime: eventData.startTime,
      },
      signups,
    });
  } catch (error) {
    logger.error({ err: error }, "v1 API error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
