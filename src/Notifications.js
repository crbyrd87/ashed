import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { markAllRead } from "./notificationHelpers";

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const TYPE_META = {
  fire:             { icon: "🔥", label: "fired your check-in" },
  comment:          { icon: "💬", label: "commented on your check-in" },
  badge:            { icon: "🏅", label: "You earned a badge" },
  friend_accepted:  { icon: "🤝", label: "accepted your friend request" },
  feedback_reply:   { icon: "💬", label: "replied to your feedback" },
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
    overlay: {
      position: "fixed", inset: 0, background: "#1a0f08", zIndex: 300,
      overflowY: "auto", fontFamily: SANS, color: "#e8d5b7",
      maxWidth: 420, margin: "0 auto",
    },
    header: {
      background: "linear-gradient(180deg, #2d1810 0%, #1a0f08 100%)",
      padding: "16px 20px", borderBottom: "1px solid #3a2510",
      display: "flex", justifyContent: "space-between", alignItems: "center",
      position: "sticky", top: 0, zIndex: 10,
    },
    card: (unread, tappable) => ({
      background: unread ? "#2a1a0e" : "#1e1208",
      borderBottom: "1px solid #3a251033",
      padding: "14px 20px",
      display: "flex", alignItems: "flex-start", gap: 12,
      cursor: tappable ? "pointer" : "default",
      transition: "background 0.15s",
    }),
    avatar: (isBadge) => ({
      width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
      background: isBadge
        ? "linear-gradient(135deg, #c9a84c, #a07830)"
        : "linear-gradient(135deg, #3a2510, #2a1508)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: isBadge ? 18 : 14,
    }),
  };

  return (
    <div style={s.overlay}>
      <div style={s.header}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#e8d5b7" }}>Notifications</div>
          <div style={{ fontSize: 11, color: "#8a7055", marginTop: 2, letterSpacing: 1 }}>
            {notifications.length === 0 ? "All caught up" : `${notifications.length} recent`}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {notifications.length > 0 && !confirmClear && (
            <button
              onClick={() => setConfirmClear(true)}
              style={{ background: "none", border: "1px solid #4a3520", borderRadius: 20, padding: "6px 12px", color: "#8a7055", fontSize: 12, cursor: "pointer", fontFamily: SANS, whiteSpace: "nowrap" }}
            >
              Clear all
            </button>
          )}
          {confirmClear && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={handleClearAll}
                style={{ background: "#a0522d22", border: "1px solid #a0522d66", borderRadius: 20, padding: "6px 12px", color: "#e8a07a", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: SANS, whiteSpace: "nowrap" }}
              >
                Clear all?
              </button>
              <button
                onClick={() => { setConfirmClear(false); setClearError(null); }}
                style={{ background: "none", border: "none", color: "#8a7055", fontSize: 12, cursor: "pointer", fontFamily: SANS }}
              >
                Cancel
              </button>
            </div>
          )}
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#8a7055", fontSize: 26, cursor: "pointer", lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      </div>

      {clearError && (
        <div style={{ background: "#a0522d18", border: "1px solid #a0522d44", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#e8a07a", margin: "14px 20px 0", lineHeight: 1.6 }}>
          {clearError}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: "40px 0", fontSize: 13, color: "#5a4535" }}>
          Loading...
        </div>
      )}

      {!loading && notifications.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", fontFamily: SANS }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔔</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#e8d5b7", marginBottom: 8 }}>
            No notifications yet
          </div>
          <div style={{ fontSize: 13, color: "#5a4535", lineHeight: 1.6 }}>
            You'll see fires, comments, badges, and friend activity here.
          </div>
        </div>
      )}

      {!loading && notifications.map((n) => {
        const meta = TYPE_META[n.type] || { icon: "🔔", label: "" };
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
          <div
            key={n.id}
            style={s.card(!n.is_read, tappable)}
            onClick={() => tappable && handleTap(n)}
          >
            <div style={s.avatar(isBadge)}>
              {meta.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#e8d5b7", lineHeight: 1.4 }}>
                {title}
              </div>
              {subtitle ? (
                <div style={{ fontSize: 12, color: "#8a7055", marginTop: 3, lineHeight: 1.4 }}>
                  {subtitle}
                </div>
              ) : null}
              <div style={{ fontSize: 11, color: "#5a4535", marginTop: 5 }}>
                {timeAgo(n.created_at)}
              </div>
            </div>
            {!n.is_read && (
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#c9a84c", flexShrink: 0, marginTop: 5 }} />
            )}
            {tappable && (
              <div style={{ fontSize: 14, color: "#4a3020", flexShrink: 0, marginTop: 2 }}>›</div>
            )}
          </div>
        );
      })}
    </div>
  );
}