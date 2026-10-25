/**
 * permissions.js - the frontend side of "who may do what".
 *
 * The server decides (Backend/utils/permissions.js) and sends a capability list with the signed-in user.
 * `useAuth().can('feed.post')` answers for the signed-in user; `userCan(user, 'feed.post')` answers for a
 * user object passed around as a prop. Never compare roles to decide a permission.
 */
export const userCan = (user, capability) => Boolean(user?.capabilities?.includes(capability));
