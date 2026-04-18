import { supabase } from "./supabase";

/**
 * Create a notification for a user.
 *
 * @param {string} userId     - The recipient's user ID
 * @param {string} actorId    - The user who triggered the action
 * @param {string} type       - "fire" | "comment" | "badge" | "friend_accepted"
 * @param {object} extras     - { checkin_id?, badge_key?, message }
 */
export const createNotification = async (userId, actorId, type, extras = {}) => {
  // Never notify yourself
  if (userId === actorId) return;

  try {
    await supabase.from("notifications").insert({
      user_id: userId,
      actor_id: actorId,
      type,
      checkin_id: extras.checkin_id || null,
      badge_key: extras.badge_key || null,
      message: extras.message || null,
      is_read: false,
    });
  } catch (e) {
    // Notifications are non-critical — fail silently
    console.error("createNotification error:", e);
  }
};

/**
 * Fetch unread notification count for a user.
 */
export const fetchUnreadCount = async (userId) => {
  if (!userId) return 0;
  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  return count || 0;
};

/**
 * Mark all notifications as read for a user.
 */
export const markAllRead = async (userId) => {
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
};