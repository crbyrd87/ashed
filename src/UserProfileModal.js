import { useState, useEffect } from "react";
import { SANS, color, type } from "./theme";
import { Pill, SectionLabel, Sheet } from "./ui";
import { supabase } from "./supabase";


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
        supabase.from("users").select("id, username, member_since").eq("id", userId).maybeSingle(),
        supabase.from("checkins").select("id, cigar_name, cigar_brand, cigar_vitola, rating, created_at, cigars(line, brand, vitola)").eq("user_id", userId).eq("visibility", "public").order("created_at", { ascending: false }).limit(5),
        supabase.from("user_badges").select("badge_key").eq("user_id", userId),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (checkinsRes.data) setCheckins(checkinsRes.data);
      if (badgesRes.data) setBadges(badgesRes.data.map(b => b.badge_key));

      // Friends query separately
      const { data: friendData } = await supabase
        .from("friends")
        .select("id, status, requester_id, recipient_id")
        .or(`requester_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`);

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

  const displayName = profile?.username || "Unknown";
  const username = profile?.username ? `@${profile.username}` : "";
  const memberSince = profile?.member_since ? new Date(profile.member_since).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "";

  return (
    <Sheet onClose={onClose} zIndex={600} handle>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0", fontSize: 13, color: color.faint }}>Loading...</div>
        ) : !profile ? (
          <div style={{ textAlign: "center", padding: "40px 0", fontSize: 13, color: color.faint }}>Profile not found.</div>
        ) : (
          <>
            {/* Profile header */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: `linear-gradient(135deg, ${color.goldLegacy}, ${color.goldDeep})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: color.bg, fontWeight: 700, flexShrink: 0 }}>
                {displayName[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: color.heading }}>{displayName}</div>
                {username && <div style={{ fontSize: 13, color: color.tan }}>{username}</div>}
                <div style={{ fontSize: type.xs, color: color.faint, marginTop: 2 }}>Member since {memberSince}</div>
              </div>
            </div>

            {/* Friend button */}
            {friendStatus === null && (
              <button onClick={handleAddFriend} disabled={actionLoading}
                style={{ width: "100%", background: `linear-gradient(135deg, ${color.goldLegacy}, ${color.goldDeep})`, border: "none", borderRadius: 10, padding: 12, color: color.bg, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: SANS, marginBottom: 20 }}>
                {actionLoading ? "Sending..." : "+ Add Friend"}
              </button>
            )}
            {friendStatus === "pending" && (
              <div style={{ width: "100%", background: color.surfaceRaised, border: `1px solid ${color.lineStrong}`, borderRadius: 10, padding: 12, color: color.dim, fontSize: 14, textAlign: "center", marginBottom: 20 }}>
                Friend Request Sent
              </div>
            )}
            {friendStatus === "friends" && (
              <div style={{ width: "100%", background: `${color.green}22`, border: `1px solid ${color.green}55`, borderRadius: 10, padding: 12, color: color.green, fontSize: 14, fontWeight: 700, textAlign: "center", marginBottom: 20 }}>
                Friends
              </div>
            )}

            {/* Badges */}
            {badges.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <SectionLabel style={{ marginBottom: 10 }}>Badges</SectionLabel>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {badges.map(key => (
                    <Pill key={key}>{key.replace(/_/g, " ").replace(/w/g, c => c.toUpperCase())}</Pill>
                  ))}
                </div>
              </div>
            )}

            {/* Recent check-ins */}
            <div>
              <div style={{ fontSize: type.xs, color: color.dim, letterSpacing: 1, marginBottom: 10 }}>RECENT SMOKES</div>
              {checkins.length === 0 ? (
                <div style={{ fontSize: 13, color: color.faint }}>No public check-ins yet.</div>
              ) : checkins.map(c => (
                <div key={c.id} style={{ background: color.surface, border: `1px solid ${color.lineStrong}`, borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: color.heading }}>
                    {c.cigars?.line || c.cigar_name || "Unknown"}
                    {(c.cigars?.vitola || c.cigar_vitola) ? ` · ${c.cigars?.vitola || c.cigar_vitola}` : ""}
                  </div>
                  <div style={{ fontSize: type.xs, color: color.dim, marginTop: 2 }}>
                    {c.cigars?.brand || c.cigar_brand || ""}
                    {c.rating ? ` · ${(c.rating / 2).toFixed(1)}` : ""}
                  </div>
                  <div style={{ fontSize: type.xs, color: color.faint, marginTop: 4 }}>
                    {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
    </Sheet>
  );
}