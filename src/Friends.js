import { useState, useEffect } from "react";
import { SANS, color, flame, font, type } from "./theme";
import { CloseButton, Icon, Screen, SkeletonRow } from "./ui";
import { supabase } from "./supabase";
import { createNotification } from "./notificationHelpers";
import { fetchUserBadges } from "./badgeEngine";
import { parseLocalDate, formatSmokeDate } from "./dateUtils";

function FriendProfile({ friendUser, currentUserId, onClose }) {
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data }, badgeData] = await Promise.all([
        supabase
          .from("checkins")
          .select("*, cigars(brand, line, vitola, strength)")
          .eq("user_id", friendUser.id)
          .in("visibility", ["public", "friends_only"])
          .order("smoke_date", { ascending: false })
          .limit(20),
        fetchUserBadges(friendUser.id),
      ]);
      setCheckins(data || []);
      setBadges(badgeData || []);
      setLoading(false);
    };
    load();
  }, [friendUser.id]);

  // Ratings are stored 0-10; the UI shows a 5-flame scale, so halve it.
  // Must match avgFlames in App.js — the same person's average is shown in both.
  const rated = checkins.filter(c => c.rating != null);
  const avgRating = rated.length
    ? (rated.reduce((a, c) => a + c.rating, 0) / rated.length / 2).toFixed(2)
    : null;

  const brandCounts = {};
  for (const c of checkins) {
    const b = c.cigars?.brand || c.cigar_brand;
    if (b) brandCounts[b] = (brandCounts[b] || 0) + 1;
  }
  const topBrands = Object.entries(brandCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const strengthCounts = {};
  for (const c of checkins) {
    const s = c.cigars?.strength;
    if (s) strengthCounts[s] = (strengthCounts[s] || 0) + 1;
  }
  const earnedBadges = badges.filter(b => b.earned);
  const initial = (friendUser.display_name || friendUser.username || "?")[0].toUpperCase();

  return (
    <Screen zIndex={400}>

      {/* Hero header */}
      <div style={{ background: color.surface, padding: "20px 20px 24px", borderBottom: `1px solid ${color.lineStrong}` }}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: color.gold, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 20, fontFamily: SANS }}>← Back</button>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: `linear-gradient(135deg, ${color.gold}, ${color.cedar})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700, color: color.bg, flexShrink: 0, border: `2px solid ${color.gold}44` }}>
            {initial}
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: color.text }}>{friendUser.display_name || friendUser.username}</div>
            <div style={{ fontSize: 13, color: color.muted, marginTop: 2 }}>@{friendUser.username}</div>
            <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span style={{ background: `${color.gold}22`, color: color.gold, border: `1px solid ${color.gold}44`, borderRadius: 20, padding: "2px 10px", fontSize: type.xs, fontWeight: 600 }}>🏅 Aficionado</span>
              <span style={{ background: `${color.green}22`, color: color.green, border: `1px solid ${color.green}44`, borderRadius: 20, padding: "2px 10px", fontSize: type.xs, fontWeight: 600 }}>✓ Friend</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 16px 32px" }}>

        {/* Smoking profile card */}
        <div style={{ background: color.surface, border: `1px solid ${color.lineStrong}`, borderRadius: 10, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: type.xs, color: color.muted, letterSpacing: 2, marginBottom: 12 }}>SMOKING PROFILE</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[["Smoked", checkins.length], ["Avg Rating", avgRating ?? "—"], ["This Year", checkins.filter(c => parseLocalDate(c.smoke_date)?.getFullYear() === new Date().getFullYear()).length]].map(([k, v], i, arr) => (
              <div key={k} style={{ flex: 1, textAlign: "center", borderRight: i < arr.length - 1 ? `1px solid ${color.lineStrong}` : "none" }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: color.gold, lineHeight: 1 }}>{v}</div>
                <div style={{ fontSize: type.xs, color: color.muted, marginTop: 5 }}>{k.toUpperCase()}</div>
              </div>
            ))}
          </div>
          {Object.keys(strengthCounts).length > 0 && (
            <div style={{ borderTop: `1px solid ${color.lineStrong}44`, paddingTop: 12 }}>
              <div style={{ fontSize: type.xs, color: color.muted, letterSpacing: 1, marginBottom: 8 }}>STRENGTH DISTRIBUTION</div>
              {[["Mild", "#a8c5a0"], ["Mild-Medium", "#b8d4a0"], ["Medium", "#d4b483"], ["Medium-Full", "#c4894a"], ["Full", color.danger]].map(([s, swatch]) => {
                const count = strengthCounts[s] || 0;
                const total = Object.values(strengthCounts).reduce((a, b) => a + b, 0);
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={s} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 70, fontSize: type.xs, color: swatch, flexShrink: 0 }}>{s === "Medium-Full" ? "Med-Full" : s}</div>
                    <div style={{ flex: 1, height: 8, background: color.surfaceRaised, borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: swatch, borderRadius: 4 }} />
                    </div>
                    <div style={{ width: 24, fontSize: type.xs, color: color.muted, textAlign: "right" }}>{count}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Badges */}
        {earnedBadges.length > 0 && (
          <div style={{ background: color.surface, border: `1px solid ${color.lineStrong}`, borderRadius: 10, padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: color.gold, fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>BADGES EARNED ({earnedBadges.length})</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {earnedBadges.map(b => (
                <div key={b.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: 52 }}>
                  <span style={{ fontSize: 28 }}>{b.icon}</span>
                  <span style={{ fontSize: type.xs, color: color.gold, textAlign: "center", lineHeight: 1.3 }}>{b.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top brands */}
        {topBrands.length > 0 && (
          <div style={{ background: color.surface, border: `1px solid ${color.lineStrong}`, borderRadius: 10, padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: color.gold, fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>TOP BRANDS</div>
            {topBrands.map(([brand, count], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: i < topBrands.length - 1 ? 8 : 0 }}>
                <div style={{ fontSize: 13, color: color.text }}>{brand}</div>
                <div style={{ fontSize: type.xs, color: color.gold, fontWeight: 700 }}>{count} smoke{count !== 1 ? "s" : ""}</div>
              </div>
            ))}
          </div>
        )}

        {/* Recent smokes */}
        <div style={{ fontSize: 13, color: color.gold, fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>RECENT SMOKES</div>
        {loading && <div style={{ padding: "4px 0" }}><div><SkeletonRow /><SkeletonRow /><SkeletonRow /></div></div>}
        {!loading && checkins.length === 0 && (
          <div style={{ fontSize: 13, color: color.faint, textAlign: "center", padding: 20 }}>No public smokes yet</div>
        )}
        {checkins.map(c => {
          const brand = c.cigars?.brand || c.cigar_brand || "Unknown";
          const line = c.cigars?.line || c.cigar_name || "Unknown";
          const vitola = c.cigars?.vitola || c.cigar_vitola || null;
          const flames = c.rating ? c.rating / 2 : null;
          return (
            <div key={c.id} style={{ background: color.surface, border: `1px solid ${color.lineStrong}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                  <div style={{ fontSize: type.xs, color: color.muted, letterSpacing: 1 }}>{brand.toUpperCase()}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: color.text, margin: "2px 0" }}>{line}</div>
                  {vitola && <div style={{ fontSize: type.xs, color: color.gold }}>{vitola}</div>}
                  <div style={{ fontSize: type.xs, color: color.faint, marginTop: 4 }}>
                    {formatSmokeDate(c.smoke_date)}
                  </div>
                </div>
                {flames !== null && (
                  <div style={{ textAlign: "center", flexShrink: 0 }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: color.gold, lineHeight: 1 }}>{flames % 1 === 0 ? flames.toFixed(0) : flames.toFixed(1)}</div>
                    <div style={{ display: "flex", gap: 2, marginTop: 4, justifyContent: "center" }}>
                      {[1,2,3,4,5].map(i => (
                        <svg key={i} width="16" height="16" viewBox="0 0 24 24">
                          <defs><linearGradient id={`fp-${c.id}-${i}`} x1="0" x2="0" y1="1" y2="0"><stop offset="0%" stopColor={flame.base}/><stop offset="100%" stopColor={flame.tip}/></linearGradient></defs>
                          <path d="M12 2C12 2 6 8 6 13a6 6 0 0012 0c0-3-2-5.5-2-5.5S14 10 12 10c0 0 1-3-0-8z"
                            fill={flames >= i ? `url(#fp-${c.id}-${i})` : color.line} />
                        </svg>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Screen>
  );
}

export default function Friends({ user, onClose, onRequestHandled }) {
  // One source for the invite link, and it points at /login.
  //
  // It used to be built from window.location.origin, so it read
  // "ashed.app?ref=name" — but Auth.js only shows the signup form when the
  // path IS /login. A referred visitor landed on the coming-soon page, which
  // links to nothing, so the form they were invited to fill in never appeared.
  // The referral was stored in localStorage and silently stranded there.
  const inviteUrl = `${window.location.origin}/login?ref=${user.user_metadata?.username || user.id}`;

  const [tab, setTab] = useState("find");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [viewingFriend, setViewingFriend] = useState(null);

  const refresh = () => setRefreshCount(c => c + 1);

  useEffect(() => {
    const loadFriendsData = async () => {
      setLoading(true);
      const { data: incoming } = await supabase
        .from("friends")
        .select("*, requester:requester_id(id, username, display_name)")
        .eq("recipient_id", user.id)
        .eq("status", "pending");
      setPendingRequests(incoming || []);

      const { data: accepted1 } = await supabase
        .from("friends")
        .select("*, friend:recipient_id(id, username, display_name)")
        .eq("requester_id", user.id)
        .eq("status", "accepted");

      const { data: accepted2 } = await supabase
        .from("friends")
        .select("*, friend:requester_id(id, username, display_name)")
        .eq("recipient_id", user.id)
        .eq("status", "accepted");

      const allFriends = [
        ...(accepted1 || []).map(f => ({ ...f, friendUser: f.friend })),
        ...(accepted2 || []).map(f => ({ ...f, friendUser: f.friend })),
      ].sort((a, b) => {
        const nameA = (a.friendUser?.display_name || a.friendUser?.username || "").toLowerCase();
        const nameB = (b.friendUser?.display_name || b.friendUser?.username || "").toLowerCase();
        return nameA.localeCompare(nameB);
      });
      setFriends(allFriends);

      const { data: sent } = await supabase
        .from("friends")
        .select("*, recipient:recipient_id(id, username, display_name)")
        .eq("requester_id", user.id)
        .eq("status", "pending");
      setSentRequests(sent || []);
      setLoading(false);
    };
    loadFriendsData();
  }, [user.id, refreshCount]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    const q = searchQuery.trim().toLowerCase();
    const { data } = await supabase
      .from("users")
      .select("id, username, display_name, email")
      .or(`username.ilike.%${q}%,email.ilike.%${q}%`)
      .neq("id", user.id)
      .limit(10);
    setSearchResults(data || []);
    setSearching(false);
  };

  const getRelationshipStatus = (targetId) => {
    if (friends.some(f => f.friendUser?.id === targetId)) return "friends";
    if (sentRequests.some(r => r.recipient?.id === targetId)) return "sent";
    if (pendingRequests.some(r => r.requester?.id === targetId)) return "incoming";
    return "none";
  };

  const handleSendRequest = async (targetId) => {
    const { error } = await supabase.from("friends").insert({
      requester_id: user.id,
      recipient_id: targetId,
      status: "pending",
    });
    if (!error) {
      setActionMsg("Friend request sent!");
      setTimeout(() => setActionMsg(null), 2000);
      refresh();
    }
  };

  const handleAccept = async (requestId) => {
    const request = pendingRequests.find(r => r.id === requestId);
    await supabase.from("friends").update({ status: "accepted" }).eq("id", requestId);
    if (request?.requester?.id) {
      createNotification(request.requester.id, user.id, "friend_accepted", { message: null }).catch(() => {});
    }
    if (onRequestHandled) onRequestHandled();
    refresh();
  };

  const handleDecline = async (requestId) => {
    await supabase.from("friends").delete().eq("id", requestId);
    if (onRequestHandled) onRequestHandled();
    refresh();
  };

  const handleCancelRequest = async (requestId) => {
    await supabase.from("friends").delete().eq("id", requestId);
    setActionMsg("Request cancelled.");
    setTimeout(() => setActionMsg(null), 2000);
    refresh();
  };

  const handleRemoveFriend = async (friendRecord) => {
    await supabase.from("friends").delete().eq("id", friendRecord.id);
    refresh();
  };

  const s = {
    header: { background: color.bg, padding: "16px 20px", borderBottom: `1px solid ${color.lineStrong}`, display: "flex", justifyContent: "space-between", alignItems: "center" },
    tab: active => ({ flex: 1, padding: "10px 0", background: "none", border: "none", borderBottom: `2px solid ${active ? color.gold : "transparent"}`, color: active ? color.gold : color.faint, fontSize: type.xs, cursor: "pointer", fontFamily: SANS, letterSpacing: 1, fontWeight: active ? 700 : 400 }),
    input: { width: "100%", background: color.surfaceRaised, border: `1px solid ${color.lineInput}`, borderRadius: 8, padding: "10px 14px", color: color.text, fontSize: type.md, fontFamily: SANS, outline: "none", boxSizing: "border-box" },
    card: { background: color.surface, border: `1px solid ${color.lineStrong}`, borderRadius: 10, padding: "12px 14px", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" },
    btn: (accent) => ({ background: "none", border: `1px solid ${accent}55`, borderRadius: 8, padding: "6px 14px", color: accent, fontSize: type.xs, cursor: "pointer", fontFamily: SANS, whiteSpace: "nowrap" }),
    btnFilled: { background: color.gold, border: "none", borderRadius: 8, padding: "6px 14px", color: color.bg, fontSize: type.xs, fontWeight: 700, cursor: "pointer", fontFamily: SANS },
  };

  if (viewingFriend) {
    return <FriendProfile friendUser={viewingFriend} currentUserId={user.id} onClose={() => setViewingFriend(null)} />;
  }

  return (
    <Screen>
      <div style={s.header}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Icon.Friends size={20} color={color.textMuted} />
            <span style={{ fontSize: 20, fontWeight: 700, color: color.text }}>Friends</span>
          </div>
          <div style={{ fontSize: type.xs, color: color.gold, fontWeight: 600, marginTop: 2, opacity: 0.8 }}>
            {friends.length} friend{friends.length !== 1 ? "s" : ""}
            {pendingRequests.length > 0 && <span style={{ color: color.alert, marginLeft: 8 }}>· {pendingRequests.length} pending</span>}
          </div>
        </div>
        <CloseButton onClose={onClose} />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${color.lineStrong}` }}>
        {[["find", "Find Friends"], ["requests", `Requests${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ""}`], ["list", "My Friends"]].map(([id, label]) => (
          <button key={id} style={s.tab(tab === id)} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      <div style={{ padding: 16 }}>

        {actionMsg && (
          <div style={{ background: `${color.green}22`, border: `1px solid ${color.green}55`, borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: color.green, textAlign: "center" }}>
            {actionMsg}
          </div>
        )}

        {/* FIND TAB */}
        {tab === "find" && (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: type.xs, color: color.muted, letterSpacing: 1, marginBottom: 8 }}>SEARCH BY USERNAME OR EMAIL</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  style={{ ...s.input, flex: 1 }}
                  placeholder="e.g. cigarfan or friend@email.com"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                />
                <button onClick={handleSearch} style={s.btnFilled}>Search</button>
              </div>
            </div>

            {searching && <div style={{ fontSize: type.xs, color: color.green, textAlign: "center", padding: 20 }}>Searching...</div>}
            {!searching && searchResults.length === 0 && searchQuery && (
              <div style={{ fontSize: 13, color: color.faint, textAlign: "center", padding: 20 }}>No users found matching "{searchQuery}"</div>
            )}

            {searchResults.map(u => {
              const status = getRelationshipStatus(u.id);
              return (
                <div key={u.id} style={s.card}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: color.text }}>{u.display_name || u.username}</div>
                    <div style={{ fontSize: type.xs, color: color.muted, marginTop: 2 }}>@{u.username}</div>
                  </div>
                  {status === "none" && <button style={s.btnFilled} onClick={() => handleSendRequest(u.id)}>+ Add</button>}
                  {status === "sent" && <span style={{ fontSize: type.xs, color: color.faint }}>Request sent</span>}
                  {status === "friends" && <span style={{ fontSize: type.xs, color: color.green }}>Friends</span>}
                  {status === "incoming" && <button style={s.btnFilled} onClick={() => handleAccept(pendingRequests.find(r => r.requester?.id === u.id)?.id)}>Accept</button>}
                </div>
              );
            })}

            {/* Invite card */}
            <div style={{ background: color.surface, border: `1px solid ${color.lineStrong}`, borderRadius: 10, padding: 16, marginTop: 16, textAlign: "center" }}>
              <div style={{ fontSize: type.xs, color: color.muted, letterSpacing: 1, marginBottom: 8 }}>INVITE A FRIEND</div>
              <div style={{ fontFamily: font.mono, fontSize: type.sm, color: color.gold, marginBottom: 4, wordBreak: "break-all" }}>
                {inviteUrl.split("//")[1] || inviteUrl}
              </div>
              <div style={{ fontSize: type.xs, color: color.faint, marginBottom: 14 }}>
                Share your link — friends who sign up get credited to you
              </div>
              <button
                onClick={async () => {
                  const url = inviteUrl;
                  if (navigator.share) {
                    try { await navigator.share({ title: "Join me on Ashed", text: `I've been logging my cigars on Ashed — a cigar journal app. Join me!`, url }); }
                    catch (e) { if (e.name !== "AbortError") navigator.clipboard?.writeText(url); }
                  } else {
                    navigator.clipboard?.writeText(url);
                    setActionMsg("Link copied to clipboard!");
                  }
                }}
                style={{ width: "100%", background: color.gold, border: "none", borderRadius: 10, padding: 12, color: color.bg, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}
              >
                Share invite link
              </button>
            </div>

            {/* Why add friends */}
            <div style={{ background: color.surface, border: `1px solid ${color.lineStrong}`, borderRadius: 10, padding: 16, marginTop: 12 }}>
              <div style={{ fontSize: type.xs, color: color.muted, letterSpacing: 1, marginBottom: 12 }}>WHY ADD FRIENDS?</div>
              {[
                { Glyph: Icon.Flame, text: "See their check-ins in your feed" },
                { Glyph: Icon.Feed, text: "Like and comment on their smokes" },
                { Glyph: Icon.Cigar, text: "Discover new cigars through their reviews" },
                { Glyph: Icon.Feed, text: "View their stats, top brands and recent smokes" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: i < 3 ? 10 : 0 }}>
                  <span style={{ flexShrink: 0, display: "flex" }}><item.Glyph size={18} color={color.textMuted} /></span>
                  <span style={{ fontSize: 13, color: color.cream }}>{item.text}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* REQUESTS TAB */}
        {tab === "requests" && (
          <>
            <div style={{ fontSize: type.xs, color: color.muted, letterSpacing: 1, marginBottom: 12 }}>INCOMING REQUESTS</div>
            {loading && <div style={{ padding: "4px 0" }}><div><SkeletonRow /><SkeletonRow /><SkeletonRow /></div></div>}
            {!loading && pendingRequests.length === 0 && (
              <div style={{ fontSize: 13, color: color.faint, textAlign: "center", padding: "16px 0 20px" }}>No incoming requests</div>
            )}
            {pendingRequests.map(req => (
              <div key={req.id} style={s.card}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: color.text }}>{req.requester?.display_name || req.requester?.username}</div>
                  <div style={{ fontSize: type.xs, color: color.muted, marginTop: 2 }}>@{req.requester?.username}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={s.btnFilled} onClick={() => handleAccept(req.id)}>Accept</button>
                  <button style={s.btn(color.danger)} onClick={() => handleDecline(req.id)}>Decline</button>
                </div>
              </div>
            ))}

            <div style={{ fontSize: type.xs, color: color.muted, letterSpacing: 1, margin: "20px 0 12px" }}>SENT REQUESTS</div>
            {!loading && sentRequests.length === 0 && (
              <div style={{ fontSize: 13, color: color.faint, textAlign: "center", padding: "16px 0 20px" }}>No sent requests</div>
            )}
            {sentRequests.map(req => (
              <div key={req.id} style={s.card}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: color.text }}>{req.recipient?.display_name || req.recipient?.username}</div>
                  <div style={{ fontSize: type.xs, color: color.muted, marginTop: 2 }}>@{req.recipient?.username}</div>
                </div>
                <button style={s.btn(color.danger)} onClick={() => handleCancelRequest(req.id)}>Cancel</button>
              </div>
            ))}
          </>
        )}

        {/* FRIENDS LIST TAB */}
        {tab === "list" && (
          <>
            <div style={{ fontSize: type.xs, color: color.muted, letterSpacing: 1, marginBottom: 12 }}>
              YOUR FRIENDS ({friends.length})
            </div>
            {loading && <div style={{ padding: "4px 0" }}><div><SkeletonRow /><SkeletonRow /><SkeletonRow /></div></div>}
            {!loading && friends.length === 0 && (
              <div style={{ textAlign: "center", padding: 40 }}>
                <div style={{ marginBottom: 12, display: "flex", justifyContent: "center" }}><Icon.Friends size={32} color={color.borderStrong} /></div>
                <div style={{ fontSize: 15, fontWeight: 700, color: color.text, marginBottom: 8 }}>No friends yet</div>
                <div style={{ fontSize: 13, color: color.faint }}>Search for friends by username or email to get started</div>
              </div>
            )}
            {friends.map(f => (
              <div key={f.id} style={{ ...s.card, cursor: "pointer" }} onClick={() => setViewingFriend(f.friendUser)}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: color.text }}>{f.friendUser?.display_name || f.friendUser?.username}</div>
                  <div style={{ fontSize: type.xs, color: color.muted, marginTop: 2 }}>@{f.friendUser?.username}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: type.xs, color: color.gold }}>View Profile ›</span>
                  <button
                    style={s.btn(color.faint)}
                    onClick={e => { e.stopPropagation(); handleRemoveFriend(f); }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

      </div>
    </Screen>
  );
}
