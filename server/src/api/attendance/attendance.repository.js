const { prisma } = require('../../data');

/**
 * One round-trip to the DB. We aggregate per-character so the API
 * stays cheap even with thousands of raids/signups.
 *
 * Statuses:
 *   PRESENT, LATE      -> present
 *   ABSENT             -> absent
 *   TENTATIVE, BENCH   -> pending
 *   no signup row      -> pending (character was not enrolled)
 *
 * CANCELLED events are excluded.
 */
async function getAttendanceSummary({ realmId, startDate, endDate, includeOptional }) {
  // Note: we use $queryRaw with parameters — never string interpolation,
  // to keep this safe against injection.
  const rows = await prisma.$queryRaw`
    WITH base_events AS (
      SELECT id, "startTime"
      FROM raid_events
      WHERE "realmId" = ${realmId}
        AND status <> 'CANCELLED'
        AND "startTime" >= ${startDate}
        AND "startTime" <= ${endDate}
        AND (${includeOptional}::boolean OR "isOptional" = false)
    ),
    -- A character's "first seen" date = the earliest signup we have for them.
    -- Used so newcomers aren't penalized for raids that happened before they joined.
    character_first_seen AS (
      SELECT
        c.id AS character_id,
        MIN(s."createdAt") AS first_seen
      FROM characters c
      LEFT JOIN raid_signups s ON s."characterId" = c.id
      WHERE c."realmId" = ${realmId}
        AND c.archived = 0
        AND (c.status IS NULL OR c.status <> 'pending')
      GROUP BY c.id
    ),
    total_events AS (
      SELECT COUNT(*)::int AS total FROM base_events
    ),
    -- One row per (character, event) for every event that happened *after* the
    -- character's first known activity. Characters with no signup history are
    -- excluded entirely (cfs.first_seen IS NOT NULL).
    matrix AS (
      SELECT
        c.id            AS character_id,
        c.name          AS character_name,
        c.class         AS character_class,
        c.spec          AS character_spec,
        c.thumbnail     AS character_thumbnail,
        cfs.first_seen  AS first_seen,
        e.id            AS event_id,
        s.status        AS signup_status
      FROM characters c
      INNER JOIN character_first_seen cfs
        ON cfs.character_id = c.id AND cfs.first_seen IS NOT NULL
      CROSS JOIN base_events e
      LEFT JOIN raid_signups s
        ON s."characterId" = c.id AND s."eventId" = e.id
      WHERE c."realmId" = ${realmId}
        AND c.archived = 0
        AND (c.status IS NULL OR c.status <> 'pending')
        AND e."startTime" >= cfs.first_seen
    ),
    per_character AS (
      SELECT
        character_id,
        character_name,
        character_class,
        character_spec,
        character_thumbnail,
        first_seen,
        COUNT(*)::int AS total_raids,
        SUM(CASE WHEN signup_status IN ('PRESENT','LATE') THEN 1 ELSE 0 END)::int AS present,
        SUM(CASE WHEN signup_status = 'ABSENT' THEN 1 ELSE 0 END)::int AS absent,
        SUM(CASE WHEN signup_status IN ('TENTATIVE','BENCH') OR signup_status IS NULL THEN 1 ELSE 0 END)::int AS pending
      FROM matrix
      GROUP BY character_id, character_name, character_class, character_spec, character_thumbnail, first_seen
    ),
    boss_assignments AS (
      SELECT
        era."characterId" AS character_id,
        COUNT(*)::int AS boss_count
      FROM event_roster_assignments era
      INNER JOIN base_events e ON e.id = era."eventId"
      WHERE era."bossId" IS NOT NULL
      GROUP BY era."characterId"
    )
    SELECT
      pc.character_id        AS "characterId",
      pc.character_name      AS "name",
      pc.character_class     AS "class",
      pc.character_spec      AS "spec",
      pc.character_thumbnail AS "thumbnail",
      pc.first_seen          AS "firstSeenAt",
      pc.total_raids         AS "totalRaids",
      pc.present             AS "present",
      pc.absent              AS "absent",
      pc.pending             AS "pending",
      COALESCE(ba.boss_count, 0) AS "bossAssignments",
      (SELECT total FROM total_events) AS "eventsCount"
    FROM per_character pc
    LEFT JOIN boss_assignments ba ON ba.character_id = pc.character_id
    ORDER BY pc.character_name ASC
  `;

  return rows;
}

/**
 * Per-event status for a single character within a date range.
 * Returns one row per event in the window (regardless of signup presence)
 * so the UI can show "not signed up" cells too.
 */
async function getCharacterAttendance({
  realmId,
  characterId,
  startDate,
  endDate,
  includeOptional,
}) {
  return prisma.$queryRaw`
    WITH first_seen AS (
      SELECT MIN("createdAt") AS at
      FROM raid_signups
      WHERE "characterId" = ${characterId}
    )
    SELECT
      e.id            AS "eventId",
      e.title         AS "title",
      e."startTime"   AS "startTime",
      e."isOptional"  AS "isOptional",
      e.status        AS "eventStatus",
      s.status        AS "signupStatus",
      s."lateTime"    AS "lateTime",
      s."absenceReason" AS "absenceReason",
      EXISTS (
        SELECT 1 FROM event_roster_assignments era
        WHERE era."eventId" = e.id
          AND era."characterId" = ${characterId}
          AND era."bossId" IS NOT NULL
      ) AS "hasBossAssignment"
    FROM raid_events e
    LEFT JOIN raid_signups s
      ON s."eventId" = e.id AND s."characterId" = ${characterId}
    CROSS JOIN first_seen fs
    WHERE e."realmId" = ${realmId}
      AND e.status <> 'CANCELLED'
      AND e."startTime" >= ${startDate}
      AND e."startTime" <= ${endDate}
      AND (${includeOptional}::boolean OR e."isOptional" = false)
      AND (fs.at IS NULL OR e."startTime" >= fs.at)
    ORDER BY e."startTime" DESC
  `;
}

module.exports = { getAttendanceSummary, getCharacterAttendance };
