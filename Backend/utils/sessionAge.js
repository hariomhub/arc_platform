/**
 * A password change signs the account out everywhere. users.password_changed_at is stored in UTC and the
 * auth middleware reads it as seconds since 1970; a session token carries the second it was signed (iat).
 *
 * `changedEpoch` is null for accounts whose password never changed (and for every account before this
 * feature shipped), which never rejects anything.
 *
 * The 2-second slack covers the second-level rounding of the stored time: the fresh session issued right
 * after a password change (so the person is not kicked out of the page they are on) must not be rejected.
 */
export const predatesPasswordChange = (decoded, changedEpoch) =>
    changedEpoch !== null && changedEpoch !== undefined && Number(decoded?.iat) + 2 < Number(changedEpoch);

/** SQL for the column the middleware reads; wall-clock UTC, so the MySQL session time zone does not matter. */
export const PASSWORD_CHANGED_EPOCH_SQL = "TIMESTAMPDIFF(SECOND, '1970-01-01 00:00:00', password_changed_at) AS pwd_changed_epoch";

// Newest first. Each step needs a newer migration than the one below it, so a database that is
// behind the code degrades gracefully instead of failing every authenticated request.
const SESSION_QUERIES = [
    {
        // 0022: the person's active team seat (tier, chapter) comes with the same lookup.
        needs: '0022_chapter_team_foundation.sql',
        sql: `SELECT u.role, u.status, u.professional_sub_type,
                     p.tier_code AS team_tier, p.chapter_id AS team_chapter_id, p.id AS team_profile_id,
                     ${PASSWORD_CHANGED_EPOCH_SQL}
              FROM users u
              LEFT JOIN chapter_lead_profiles p ON p.active_user_id = u.id
              WHERE u.id = ?`,
    },
    {
        needs: '0021_auth_otp.sql',
        sql: `SELECT role, status, professional_sub_type, ${PASSWORD_CHANGED_EPOCH_SQL} FROM users WHERE id = ?`,
    },
    {
        needs: null,
        sql: 'SELECT role, status, professional_sub_type FROM users WHERE id = ?',
    },
];

const warnedLevels = new Set();

/**
 * The per-request lookup both auth middlewares make. If a newer migration has not been applied yet
 * its columns do not exist: fall back to the next older query and say so (once) in the log. What is
 * lost until the migration runs: without 0022 nobody has a tier (everyone on the chapter team is
 * treated as a lead, as before); without 0021 sessions are not signed out on a password change.
 */
export const fetchSessionUser = async (pool, userId) => {
    for (let i = 0; i < SESSION_QUERIES.length; i += 1) {
        const { sql, needs } = SESSION_QUERIES[i];
        try {
            const [rows] = await pool.query(sql, [userId]);
            return rows;
        } catch (err) {
            const missingSchema = err.code === 'ER_BAD_FIELD_ERROR' || err.code === 'ER_NO_SUCH_TABLE';
            if (!missingSchema || i === SESSION_QUERIES.length - 1) throw err;
            if (!warnedLevels.has(needs)) {
                warnedLevels.add(needs);
                console.error(`[Auth] Run migration ${needs}: the session lookup is using an older query until then.`);
            }
        }
    }
    return [];
};
