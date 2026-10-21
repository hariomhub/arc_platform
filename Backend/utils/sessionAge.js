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

let warnedMissingColumn = false;

/**
 * The per-request lookup both auth middlewares make. If migration 0021 has not been applied yet the column
 * does not exist: fall back to the old query instead of failing every authenticated request, and say so
 * (once) in the log. The only thing lost until the migration runs is sign-out-everywhere on a password change.
 */
export const fetchSessionUser = async (pool, userId) => {
    try {
        const [rows] = await pool.query(
            `SELECT role, status, professional_sub_type, ${PASSWORD_CHANGED_EPOCH_SQL} FROM users WHERE id = ?`,
            [userId],
        );
        return rows;
    } catch (err) {
        if (err.code !== 'ER_BAD_FIELD_ERROR') throw err;
        if (!warnedMissingColumn) {
            warnedMissingColumn = true;
            console.error('[Auth] users.password_changed_at is missing: run migration 0021_auth_otp.sql. Sessions are NOT signed out on a password change until then.');
        }
        const [rows] = await pool.query('SELECT role, status, professional_sub_type FROM users WHERE id = ?', [userId]);
        return rows;
    }
};
