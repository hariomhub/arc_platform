import { deleteFromBlob } from './azureBlobService.js';

const LEADER_ROLES = ['council_member', 'founding_member'];

function tombstoneName(role) {
    return LEADER_ROLES.includes(role) ? 'Former Chapter Lead' : 'Former Member';
}

// Scrubs a user's identifying data in place and removes their private,
// non-shared records. Posts, resources, reviews, and votes are left
// untouched — they keep pointing at this same (now-anonymized) user row,
// so nobody else's content or counts are affected by this deletion.
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
            sub_type_upgrade_status = NULL
         WHERE id = ?`,
        [tombstoneName(user.role), tombstoneEmail, userId]
    );

    // Purely private records with no display value to anyone else.
    await conn.query('DELETE FROM notifications       WHERE target_user_id = ?', [userId]);
    await conn.query('DELETE FROM notification_reads  WHERE user_id = ?', [userId]);
    await conn.query('DELETE FROM feed_saves          WHERE user_id = ?', [userId]);
    await conn.query('DELETE FROM push_tokens         WHERE user_id = ?', [userId]);
    await conn.query('DELETE FROM event_registrations WHERE user_id = ?', [userId]);
    await conn.query('DELETE FROM membership_applications WHERE user_id = ?', [userId]);
    await conn.query('DELETE FROM email_verifications WHERE email = ?', [user.email]);
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
