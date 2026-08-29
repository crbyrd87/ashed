import { useState, useEffect } from "react";
import { SANS, color, type } from "./theme";
import { ClickableRow, Icon, Screen, SkeletonRow } from "./ui";
import { supabase } from "./supabase";
import { markAllRead } from "./notificationHelpers";

const TYPE_META = {
  fire:             { Icon: Icon.Flame,   label: "liked your check-in" },
  comment:          { Icon: Icon.Feed,    label: "commented on your check-in" },
  badge:            { Icon: Icon.Check,   label: "You earned a badge" },
  friend_accepted:  { Icon: Icon.Friends, label: "accepted your friend request" },
  feedback_reply:   { Icon: Icon.Feed,    label: "replied to your feedback" },
};

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Notifications({ user, onClose, onOpenCheckin, onOpenBadges, onOpenFriends }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  // 10-A: clearing is destructive, so it asks first. Inline rather than
  // window.confirm, matching the pattern Humidor already uses.
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearError, setClearError] = useState(null);

  useEffect(() => {
    if (!user) return;
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const loadNotifications = async () => {
    setLoading(true);

    const { data } = await supabase
      .from("notifications")
      .select("*, actor:actor_id(username, display_name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    setNotifications(data || []);
    setLoading(false);

    // Mark all as read now that the user has opened the center.
    await markAllRead(user.id);
    // 10-C: this used to update only the database. Local state still said
    // unread, so the gold dots sat there for the rest of the session while
    // the header count had already dropped to zero — the screen contradicted
    // itself until you left and came back.
    setNotifications(prev => prev.map(n => (n.is_read ? n : { ...n, is_read: true })));
  };

  // 10-B: badge and friend_accepted rows looked identical to rows that
  // navigate, but nothing happened when they were tapped.
  const destinationFor = (n) => {
    if (n.type === "badge" && onOpenBadges) return onOpenBadges;
    if (n.type === "friend_accepted" && onOpenFriends) return onOpenFriends;
    if (n.checkin_id && onOpenCheckin) return () => onOpenCheckin(n.checkin_id);
    return null;
  };

  const handleTap = (n) => {
    const go = destinationFor(n);
    if (!go) return;
    go();
    onClose();
  };

  const handleClearAll = async () => {
    setClearError(null);
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", user.id);
    if (error) {
      console.error("[Notifications] Clear failed:", error.message);
      setClearError("Couldn't clear notifications. Please try again.");
      return;
    }
    setNotifications([]);
    setConfirmClear(false);
  };

  const s = {
    header: {
      background: color.bg,
      padding: "16px 20px", borderBottom: `1px solid ${color.line}`,
      display: "flex", justifyContent: "space-between", alignItems: "center",
      position: "sticky", top: 0, zIndex: 10,
    },
    card: (unread, tappable) => ({
      background: unread ? color.surfaceRaised : color.surfaceSunken,
      borderBottom: `1px solid ${color.line}33`,
      padding: "14px 20px",
      display: "flex", alignItems: "flex-start", gap: 12,
      cursor: tappable ? "pointer" : "default",
      transition: "background 0.15s",
    }),
    avatar: (isBadge) => ({
      width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
      background: isBadge
        ? color.gold
        : color.surface,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: isBadge ? 18 : 14,
    }),
  };

  return (
    <Screen>
      <div style={s.header}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: color.text }}>Notifications</div>
          <div style={{ fontSize: type.xs, color: color.muted, marginTop: 2, letterSpacing: 1 }}>
            {notifications.length === 0 ? "All caught up" : `${notifications.length} recent`}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {notifications.length > 0 && !confirmClear && (
            <button
              onClick={() => setConfirmClear(true)}
              style={{ background: "none", border: `1px solid ${color.lineStrong}`, borderRadius: 20, padding: "6px 12px", color: color.muted, fontSize: type.xs, cursor: "pointer", fontFamily: SANS, whiteSpace: "nowrap" }}
            >
              Clear all
            </button>
          )}
          {confirmClear && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={handleClearAll}
                style={{ background: `${color.danger}22`, border: `1px solid ${color.danger}66`, borderRadius: 20, padding: "6px 12px", color: color.dangerText, fontSize: type.xs, fontWeight: 700, cursor: "pointer", fontFamily: SANS, whiteSpace: "nowrap" }}
              >
                Clear all?
              </button>
              <button
                onClick={() => { setConfirmClear(false); setClearError(null); }}
                style={{ background: "none", border: "none", color: color.muted, fontSize: type.xs, cursor: "pointer", fontFamily: SANS }}
              >
                Cancel
              </button>
            </div>
          )}
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: color.muted, fontSize: 26, cursor: "pointer", lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      </div>

      {clearError && (
        <div style={{ background: `${color.danger}18`, border: `1px solid ${color.danger}44`, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: color.dangerText, margin: "14px 20px 0", lineHeight: 1.6 }}>
          {clearError}
        </div>
      )}

      {loading && (
        <div style={{ padding: "4px 0" }}><div><SkeletonRow /><SkeletonRow /><SkeletonRow /></div></div>
      )}

      {!loading && notifications.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", fontFamily: SANS }}>
          <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}><Icon.Bell size={32} color={color.borderStrong} /></div>
          <div style={{ fontSize: 15, fontWeight: 700, color: color.text, marginBottom: 8 }}>
            No notifications yet
          </div>
          <div style={{ fontSize: 13, color: color.faint, lineHeight: 1.6 }}>
            You'll see fires, comments, badges, and friend activity here.
          </div>
        </div>
      )}

      {!loading && notifications.map((n) => {
        const meta = TYPE_META[n.type] || { Icon: Icon.Bell, label: "" };
        const isBadge = n.type === "badge";
        const actorName = n.actor?.username
          ? `@${n.actor.username}`
          : n.actor?.display_name || "Someone";

        let title = "";
        let subtitle = "";

        if (isBadge) {
          title = "New badge earned!";
          subtitle = n.message || "Check your badges.";
        } else if (n.type === "friend_accepted") {
          title = `${actorName} ${meta.label}`;
          subtitle = "You're now friends. See their check-ins in your feed.";
        } else if (n.type === "feedback_reply") {
          title = n.message || "Ashed replied to your feedback";
          subtitle = "View your reply in Settings → Help";
        } else {
          title = `${actorName} ${meta.label}`;
          subtitle = n.message || "";
        }

        const tappable = !!destinationFor(n);

        return (
          <ClickableRow
            key={n.id}
            label="Open this notification"
            style={s.card(!n.is_read, tappable)}
            onClick={() => tappable && handleTap(n)}
          >
            <div style={s.avatar(isBadge)}>
              <meta.Icon size={17} color={isBadge ? color.gold : color.textMuted} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: color.text, lineHeight: 1.4 }}>
                {title}
              </div>
              {subtitle ? (
                <div style={{ fontSize: type.xs, color: color.muted, marginTop: 3, lineHeight: 1.4 }}>
                  {subtitle}
                </div>
              ) : null}
              <div style={{ fontSize: type.xs, color: color.faint, marginTop: 5 }}>
                {timeAgo(n.created_at)}
              </div>
            </div>
            {!n.is_read && (
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: color.gold, flexShrink: 0, marginTop: 5 }} />
            )}
            {tappable && (
              <div style={{ fontSize: 14, color: color.lineInput, flexShrink: 0, marginTop: 2 }}>›</div>
            )}
          </ClickableRow>
        );
      })}
    </Screen>
  );
}