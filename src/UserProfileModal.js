import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const BADGE_ICONS = {
  first_ash: "🔥", smoke_10: "🔟", smoke_25: "💨", smoke_50: "⭐", smoke_100: "💯",
  smoke_250: "🏆", smoke_500: "👑", founding_member: "🎖️", ambassador: "🤝",
  recruiter: "📣", legend_maker: "🌟", globe_trotter: "🌍", variety_seeker: "🎨",
  connoisseur: "🧐", well_traveled: "✈️", well_loved: "❤️", fan_favorite: "⚡",
  smoke_circle: "⭕", regular: "📍",
};

export default function UserProfileModal({ userId, currentUser, onClose }) {
  const [profile, setProfile] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [badges, setBadges] = useState([]);
  const [friendStatus, setFriendStatus] = useState(null); // null, "pending", "friends"
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadProfile = async () => {
    setLoading(true);
    try {
      const [profileRes, checkinsRes, badgesRes] = await Promise.all([
        supabase.from("users").select("id, username, display_name, created_at").eq("id", userId).maybeSingle(),
        supabase.from("checkins").select("id, cigar_name, cigar_brand, cigar_vitola, rating, created_at, cigars(line, brand, vitola)").eq("user_id", userId).eq("visibility", "public").order("created_at", { ascending: false }).limit(5),
        supabase.from("user_badges").select("badge_key").eq("user_id", userId),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (checkinsRes.data) setCheckins(checkinsRes.data);
      if (badgesRes.data) setBadges(badgesRes.data.map(b => b.badge_key));

      // Friends query separately to avoid breaking the Promise.all
      const { data: friendData } = await supabase
        .from("friends")
        .select("id, status, requester_id, recipient_id")
        .or(`requester_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`)
        .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`);

      if (friendData) {
        const rel = friendData.find(f =>
          (f.requester_id === currentUser.id && f.recipient_id === userId) ||
          (f.requester_id === userId && f.recipient_id === currentUser.id)
        );
        if (rel) setFriendStatus(rel.status === "accepted" ? "friends" : "pending");
        else setFriendStatus(null);
      }
    } catch (e) {
      console.error("Profile load error:", e);
    }
    setLoading(false);
  };

  const handleAddFriend = async () => {
    setActionLoading(true);
    await supabase.from("friends").insert({ requester_id: currentUser.id, recipient_id: userId, status: "pending" });
    setFriendStatus("pending");
    setActionLoading(false);
  };

  const displayName = profile?.display_name || profile?.username || "Unknown";
  const username = profile?.username ? `@${profile.username}` : "";
  const memberSince = profile?.created_at ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 600, display: "flex", alignItems: "flex-end", justifyContent: "center", fontFamily: SANS }}
      onClick={onClose}>
      <div style={{ background: "#1a0f08", border: "1px solid #4a3520", borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto", padding: "20px 20px 36px" }}
        onClick={e => e.stopPropagation()}>

        {/* Handle bar */}
        <div style={{ width: 40, height: 4, background: "#4a3520", borderRadius: 2, margin: "0 auto 20px" }} />

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0", fontSize: 13, color: "#5a4535" }}>Loading...</div>
        ) : !profile ? (
          <div style={{ textAlign: "center", padding: "40px 0", fontSize: 13, color: "#5a4535" }}>Profile not found.</div>
        ) : (
          <>
            {/* Profile header */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #d4b45a, #a07830)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#1a0f08", fontWeight: 700, flexShrink: 0 }}>
                {displayName[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#f5ead8" }}>{displayName}</div>
                {username && <div style={{ fontSize: 13, color: "#a08060" }}>{username}</div>}
                <div style={{ fontSize: 11, color: "#5a4535", marginTop: 2 }}>Member since {memberSince}</div>
              </div>
            </div>

            {/* Friend button */}
            {friendStatus === null && (
              <button onClick={handleAddFriend} disabled={actionLoading}
                style={{ width: "100%", background: "linear-gradient(135deg, #d4b45a, #a07830)", border: "none", borderRadius: 10, padding: 12, color: "#1a0f08", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: SANS, marginBottom: 20 }}>
                {actionLoading ? "Sending..." : "+ Add Friend"}
              </button>
            )}
            {friendStatus === "pending" && (
              <div style={{ width: "100%", background: "#2a1a0e", border: "1px solid #4a3520", borderRadius: 10, padding: 12, color: "#7a6048", fontSize: 14, textAlign: "center", marginBottom: 20 }}>
                Friend Request Sent
              </div>
            )}
            {friendStatus === "friends" && (
              <div style={{ width: "100%", background: "#7a9a7a22", border: "1px solid #7a9a7a55", borderRadius: 10, padding: 12, color: "#7a9a7a", fontSize: 14, fontWeight: 700, textAlign: "center", marginBottom: 20 }}>
                ✓ Friends
              </div>
            )}

            {/* Badges */}
            {badges.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: "#7a6048", letterSpacing: 1, marginBottom: 10 }}>BADGES</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {badges.map(key => (
                    <span key={key} title={key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                      style={{ fontSize: 22 }}>
                      {BADGE_ICONS[key] || "🏅"}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recent check-ins */}
            <div>
              <div style={{ fontSize: 11, color: "#7a6048", letterSpacing: 1, marginBottom: 10 }}>RECENT SMOKES</div>
              {checkins.length === 0 ? (
                <div style={{ fontSize: 13, color: "#5a4535" }}>No public check-ins yet.</div>
              ) : checkins.map(c => (
                <div key={c.id} style={{ background: "#221508", border: "1px solid #4a3520", borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#f5ead8" }}>
                    {c.cigars?.line || c.cigar_name || "Unknown"}
                    {(c.cigars?.vitola || c.cigar_vitola) ? ` · ${c.cigars?.vitola || c.cigar_vitola}` : ""}
                  </div>
                  <div style={{ fontSize: 11, color: "#7a6048", marginTop: 2 }}>
                    {c.cigars?.brand || c.cigar_brand || ""}
                    {c.rating ? ` · ${"🔥".repeat(Math.round(c.rating / 2))}` : ""}
                  </div>
                  <div style={{ fontSize: 10, color: "#5a4535", marginTop: 4 }}>
                    {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}