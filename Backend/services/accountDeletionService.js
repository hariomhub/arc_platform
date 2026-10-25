import { deleteFromBlob } from './azureBlobService.js';
import { endActiveProfile, voidReferral } from './chapterLeadService.js';
import { redactAuditForUser } from './auditService.js';
import { TIERS } from '../utils/chapterLeadRules.js';

const LEADER_ROLES = ['council_member', 'founding_member'];

function tombstoneName(role) {
    return LEADER_ROLES.includes(role) ? 'Former Chapter Lead' : 'Former Member';
}

// A statement against a table from a migration that may not be applied yet must not fail the deletion.
const ignoreMissingTable = async (run) => {
    try {
        await run();
    } catch (err) {
        if (err.code !== 'ER_NO_SUCH_TABLE' && err.code !== 'ER_BAD_FIELD_ERROR') throw err;
    }
};

// Scrubs a user's identifying data in place and removes their private,
// non-shared records. Posts, resources, reviews, and votes are left
// untouched — they keep pointing at this same (now-anonymized) user row,
// so nobody else's content or counts are affected by this deletion.
//
// Returns { vacatedChapterId }: the chapter whose LEAD seat this emptied (or null). The caller raises
// the "chapter has no lead" alert AFTER its transaction commits.
export async function softDeleteUser(conn, user) {
    const userId = user.id;
    const tombstoneEmail = `deleted-user-${userId}@deleted.riskaicouncil.internal`;

    await conn.query(
        `UPDATE users SET
            status = 'deleted',
            name = ?,
            email = ?,
            password_hash = NULL,
            photo_url = NULL,
            bio = NULL,
            linkedin_url = NULL,
            linkedin_id = NULL,
            linkedin_access_token = NULL,
            organization_name = NULL,
            profile_badge = NULL,
            professional_sub_type = NULL,
            pending_sub_type_upgrade = 0,
            sub_type_upgrade_status = NULL,
            country_code = NULL,
            chapter_id = NULL
         WHERE id = ?`,
        [tombstoneName(user.role), tombstoneEmail, userId]
    );

    // Chapter programme: end the active stint (the referral code stops accepting new sign-ups)
    // and void a still-pending referral. Qualified referrals, quarter results and consent records
    // are history and are kept — they point at this same tombstoned user row, exactly like posts
    // and votes.
    const ended = await endActiveProfile(conn, userId, { status: 'ended', reason: 'Account deleted', endCode: 'account_deleted' });
    await voidReferral(userId, 'Referred account was deleted', conn);
    // An ambassador's leftover posts read "Former Chapter Ambassador", not "Former Chapter Lead".
    if (ended.ended && ended.tier === TIERS.AMBASSADOR) {
        await conn.query('UPDATE users SET name = ? WHERE id = ?', ['Former Chapter Ambassador', userId]);
    }
    // The consent records (version + time) stay as evidence; the IP address is personal data and goes.
    await conn.query('UPDATE policy_acceptances SET ip_address = NULL WHERE user_id = ?', [userId]);
    await ignoreMissingTable(() => conn.query('UPDATE earnings_elections SET ip_address = NULL WHERE user_id = ?', [userId]));
    // Change history keeps the fact that something happened; the personal details inside it go.
    await ignoreMissingTable(() => redactAuditForUser(conn, userId));
    await ignoreMissingTable(() => conn.query('DELETE FROM member_display_settings WHERE user_id = ?', [userId]));

    // Purely private records with no display value to anyone else.
    await conn.query('DELETE FROM notifications       WHERE target_user_id = ?', [userId]);
    await conn.query('DELETE FROM notification_reads  WHERE user_id = ?', [userId]);
    await conn.query('DELETE FROM feed_saves          WHERE user_id = ?', [userId]);
    await conn.query('DELETE FROM push_tokens         WHERE user_id = ?', [userId]);
    await conn.query('DELETE FROM event_registrations WHERE user_id = ?', [userId]);
    await conn.query('DELETE FROM membership_applications WHERE user_id = ?', [userId]);
    await conn.query('DELETE FROM email_verifications WHERE email = ?', [user.email]);
    await ignoreMissingTable(() => conn.query('DELETE FROM auth_otps WHERE email = ?', [String(user.email).toLowerCase()]));

    return { vacatedChapterId: ended.ended && ended.tier === TIERS.LEAD ? ended.chapterId : null };
}

// Best-effort profile photo cleanup — not part of the DB transaction.
export async function purgeProfilePhoto(user) {
    if (!user.photo_url) return;
    try {
        await deleteFromBlob(user.photo_url);
    } catch (blobErr) {
        console.warn('[AccountDeletion] Could not delete profile photo blob:', blobErr.message);
    }
}
