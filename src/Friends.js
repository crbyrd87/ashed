import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { createNotification } from "./notificationHelpers";

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const strengthColor = s => ({ "Light": "#a8c5a0", "Medium": "#d4b483", "Medium-Full": "#c4894a", "Full": "#a0522d" }[s] || "#888");

function FriendProfile({ friendUser, currentUserId, onClose }) {
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("checkins")
        .select("*, cigars(brand, line, vitola, strength)")
        .eq("user_id", friendUser.id)
        .in("visibility", ["public", "friends_only"])
        .order("smoke_date", { ascending: false })
        .limit(20);
      setCheckins(data || []);
      setLoading(false);
    };
    load();
  }, [friendUser.id]);

  const avgRating = checkins.length
    ? (checkins.filter(c => c.rating).reduce((a, c) => a + c.rating, 0) / checkins.filter(c => c.rating).length).toFixed(1)
    : null;

  const thisYear = checkins.filter(c => new Date(c.smoke_date).getFullYear() === new Date().getFullYear()).length;

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
  const favStrength = Object.entries(strengthCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  return (
    <div style={{ position: "fixed", inset: 0, background: "#1a0f08", zIndex: 400, overflowY: "auto", fontFamily: SANS, maxWidth: 420, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(180deg, #2d1810 0%, #1a0f08 100%)", padding: "16px 20px", borderBottom: "1px solid #4a3520", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#c9a84c", fontSize: 13, cursor: "pointer", fontFamily: SANS }}>← Back</button>
        <div style={{ fontSize: 12, color: "#8a7055" }}>FRIEND PROFILE</div>
        <div style={{ width: 48 }} />
      </div>

      <div style={{ padding: 20 }}>
        {/* Avatar + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "linear-gradient(135deg, #c9a84c, #7a4a20)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
            {(friendUser.display_name || friendUser.username || "?")[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#e8d5b7" }}>{friendUser.display_name || friendUser.username}</div>
            <div style={{ fontSize: 12, color: "#8a7055", marginTop: 2 }}>@{friendUser.username}</div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[
            ["Smoked", checkins.length],
            ["Avg Rating", avgRating ?? "—"],
            ["This Year", thisYear],
          ].map(([k, v]) => (
            <div key={k} style={{ flex: 1, background: "#221508", border: "1px solid #4a3520", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#c9a84c" }}>{v}</div>
              <div style={{ fontSize: 10, color: "#8a7055", letterSpacing: 1, marginTop: 2 }}>{k.toUpperCase()}</div>
            </div>
          ))}
        </div>

        {/* Top brands + fav strength */}
        {(topBrands.length > 0 || favStrength) && (
          <div style={{ background: "#221508", border: "1px solid #4a3520", borderRadius: 10, padding: 14, marginBottom: 20 }}>
            {topBrands.length > 0 && (
              <div style={{ marginBottom: favStrength ? 12 : 0 }}>
                <div style={{ fontSize: 10, color: "#8a7055", letterSpacing: 1, marginBottom: 8 }}>TOP BRANDS</div>
                {topBrands.map(([brand, count], i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: i < topBrands.length - 1 ? 6 : 0 }}>
                    <div style={{ fontSize: 13, color: "#e8d5b7" }}>{brand}</div>
                    <div style={{ fontSize: 11, color: "#c9a84c", fontWeight: 700 }}>{count} smoke{count !== 1 ? "s" : ""}</div>
                  </div>
                ))}
              </div>
            )}
            {favStrength && (
              <div style={{ borderTop: topBrands.length > 0 ? "1px solid #4a352033" : "none", paddingTop: topBrands.length > 0 ? 12 : 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 10, color: "#8a7055", letterSpacing: 1 }}>PREFERRED STRENGTH</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: strengthColor(favStrength) }}>{favStrength}</div>
              </div>
            )}
          </div>
        )}

        {/* Recent check-ins */}
        <div style={{ fontSize: 10, color: "#8a7055", letterSpacing: 1, marginBottom: 12 }}>RECENT SMOKES</div>
        {loading && <div style={{ fontSize: 12, color: "#7a9a7a", textAlign: "center", padding: 20 }}>Loading...</div>}
        {!loading && checkins.length === 0 && (
          <div style={{ fontSize: 13, color: "#5a4535", textAlign: "center", padding: 20 }}>No public smokes yet</div>
        )}
        {checkins.map(c => {
          const brand = c.cigars?.brand || c.cigar_brand || "Unknown";
          const line = c.cigars?.line || c.cigar_name || "Unknown";
          const vitola = c.cigars?.vitola || c.cigar_vitola || null;
          const flames = c.rating ? c.rating / 2 : null;
          return (
            <div key={c.id} style={{ background: "#221508", border: "1px solid #4a3520", borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                  <div style={{ fontSize: 10, color: "#8a7055", letterSpacing: 1 }}>{brand.toUpperCase()}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#e8d5b7", margin: "2px 0" }}>{line}</div>
                  {vitola && <div style={{ fontSize: 11, color: "#c9a84c" }}>{vitola}</div>}
                </div>
                {flames !== null && (
                  <div style={{ textAlign: "center", flexShrink: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#c9a84c" }}>{flames % 1 === 0 ? flames.toFixed(0) : flames.toFixed(1)}</div>
                    <div style={{ display: "flex", gap: 1 }}>
                      {[1,2,3,4,5].map(i => (
                        <svg key={i} width="12" height="12" viewBox="0 0 24 24">
                          <defs><linearGradient id={`fp-${c.id}-${i}`} x1="0" x2="0" y1="1" y2="0"><stop offset="0%" stopColor="#cc2200"/><stop offset="100%" stopColor="#ffcc00"/></linearGradient></defs>
                          <path d="M12 2C12 2 6 8 6 13a6 6 0 0012 0c0-3-2-5.5-2-5.5S14 10 12 10c0 0 1-3-0-8z"
                            fill={flames >= i ? `url(#fp-${c.id}-${i})` : flames >= i - 0.5 ? `url(#fp-${c.id}-${i})` : "#3a2510"} />
                        </svg>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ fontSize: 10, color: "#5a4535", marginTop: 6 }}>
                {new Date(c.smoke_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Friends({ user, onClose, onRequestHandled }) {
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
      ];
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
    overlay: { position: "fixed", inset: 0, background: "#1a0f08", zIndex: 300, overflowY: "auto", fontFamily: SANS, color: "#e8d5b7", maxWidth: 420, margin: "0 auto" },
    header: { background: "linear-gradient(180deg, #2d1810 0%, #1a0f08 100%)", padding: "16px 20px", borderBottom: "1px solid #4a3520", display: "flex", justifyContent: "space-between", alignItems: "center" },
    tab: active => ({ flex: 1, padding: "10px 0", background: "none", border: "none", borderBottom: `2px solid ${active ? "#c9a84c" : "transparent"}`, color: active ? "#c9a84c" : "#5a4535", fontSize: 12, cursor: "pointer", fontFamily: SANS, letterSpacing: 1, fontWeight: active ? 700 : 400 }),
    input: { width: "100%", background: "#2a1a0e", border: "1px solid #4a3020", borderRadius: 8, padding: "10px 14px", color: "#e8d5b7", fontSize: 16, fontFamily: SANS, outline: "none", boxSizing: "border-box" },
    card: { background: "#221508", border: "1px solid #4a3520", borderRadius: 10, padding: "12px 14px", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" },
    btn: (color) => ({ background: "none", border: `1px solid ${color}55`, borderRadius: 8, padding: "6px 14px", color, fontSize: 12, cursor: "pointer", fontFamily: SANS, whiteSpace: "nowrap" }),
    btnFilled: { background: "linear-gradient(135deg, #c9a84c, #a07830)", border: "none", borderRadius: 8, padding: "6px 14px", color: "#1a0f08", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: SANS },
  };

  if (viewingFriend) {
    return <FriendProfile friendUser={viewingFriend} currentUserId={user.id} onClose={() => setViewingFriend(null)} />;
  }

  return (
    <div style={s.overlay}>
      <div style={s.header}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 20 }}>👥</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: "#e8d5b7" }}>Friends</span>
          </div>
          <div style={{ fontSize: 11, color: "#c9a84c", fontWeight: 600, marginTop: 2, opacity: 0.8 }}>
            {friends.length} friend{friends.length !== 1 ? "s" : ""}
            {pendingRequests.length > 0 && <span style={{ color: "#e8632a", marginLeft: 8 }}>· {pendingRequests.length} pending</span>}
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#8a7055", fontSize: 24, cursor: "pointer" }}>×</button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #4a3520" }}>
        {[["find", "Find Friends"], ["requests", `Requests${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ""}`], ["list", "My Friends"]].map(([id, label]) => (
          <button key={id} style={s.tab(tab === id)} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      <div style={{ padding: 16 }}>

        {actionMsg && (
          <div style={{ background: "#7a9a7a22", border: "1px solid #7a9a7a55", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#7a9a7a", textAlign: "center" }}>
            {actionMsg}
          </div>
        )}

        {/* FIND TAB */}
        {tab === "find" && (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 8 }}>SEARCH BY USERNAME OR EMAIL</div>
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

            {searching && <div style={{ fontSize: 12, color: "#7a9a7a", textAlign: "center", padding: 20 }}>Searching...</div>}
            {!searching && searchResults.length === 0 && searchQuery && (
              <div style={{ fontSize: 13, color: "#5a4535", textAlign: "center", padding: 20 }}>No users found matching "{searchQuery}"</div>
            )}

            {searchResults.map(u => {
              const status = getRelationshipStatus(u.id);
              return (
                <div key={u.id} style={s.card}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#e8d5b7" }}>{u.display_name || u.username}</div>
                    <div style={{ fontSize: 11, color: "#8a7055", marginTop: 2 }}>@{u.username}</div>
                  </div>
                  {status === "none" && <button style={s.btnFilled} onClick={() => handleSendRequest(u.id)}>+ Add</button>}
                  {status === "sent" && <span style={{ fontSize: 11, color: "#5a4535" }}>Request sent</span>}
                  {status === "friends" && <span style={{ fontSize: 11, color: "#7a9a7a" }}>✓ Friends</span>}
                  {status === "incoming" && <button style={s.btnFilled} onClick={() => handleAccept(pendingRequests.find(r => r.requester?.id === u.id)?.id)}>Accept</button>}
                </div>
              );
            })}

            {/* Invite card */}
            <div style={{ background: "#221508", border: "1px solid #4a3520", borderRadius: 10, padding: 16, marginTop: 16, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 8 }}>INVITE A FRIEND</div>
              <div style={{ fontSize: 13, color: "#c9a84c", marginBottom: 4, wordBreak: "break-all" }}>
                ashed.app?ref={user.user_metadata?.username || user.id}
              </div>
              <div style={{ fontSize: 12, color: "#5a4535", marginBottom: 14 }}>
                Share your link — friends who sign up get credited to you
              </div>
              <button
                onClick={async () => {
                  const username = user.user_metadata?.username || user.id;
                  const url = `${window.location.origin}?ref=${username}`;
                  if (navigator.share) {
                    try { await navigator.share({ title: "Join me on Ashed", text: `I've been logging my cigars on Ashed — a cigar journal app. Join me! 🚬`, url }); }
                    catch (e) { if (e.name !== "AbortError") navigator.clipboard?.writeText(url); }
                  } else {
                    navigator.clipboard?.writeText(url);
                    setActionMsg("Link copied to clipboard!");
                  }
                }}
                style={{ width: "100%", background: "linear-gradient(135deg, #c9a84c, #a07830)", border: "none", borderRadius: 10, padding: 12, color: "#1a0f08", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}
              >
                📲 Share Invite Link
              </button>
            </div>

            {/* Why add friends */}
            <div style={{ background: "#221508", border: "1px solid #4a3520", borderRadius: 10, padding: 16, marginTop: 12 }}>
              <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 12 }}>WHY ADD FRIENDS?</div>
              {[
                { icon: "🔥", text: "See their check-ins in your feed" },
                { icon: "👍", text: "Like and comment on their smokes" },
                { icon: "🚬", text: "Discover new cigars through their reviews" },
                { icon: "📊", text: "View their stats, top brands and recent smokes" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: i < 3 ? 10 : 0 }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ fontSize: 13, color: "#c8b89a" }}>{item.text}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* REQUESTS TAB */}
        {tab === "requests" && (
          <>
            <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 12 }}>INCOMING REQUESTS</div>
            {loading && <div style={{ fontSize: 12, color: "#7a9a7a", textAlign: "center", padding: 20 }}>Loading...</div>}
            {!loading && pendingRequests.length === 0 && (
              <div style={{ fontSize: 13, color: "#5a4535", textAlign: "center", padding: "16px 0 20px" }}>No incoming requests</div>
            )}
            {pendingRequests.map(req => (
              <div key={req.id} style={s.card}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#e8d5b7" }}>{req.requester?.display_name || req.requester?.username}</div>
                  <div style={{ fontSize: 11, color: "#8a7055", marginTop: 2 }}>@{req.requester?.username}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={s.btnFilled} onClick={() => handleAccept(req.id)}>Accept</button>
                  <button style={s.btn("#a0522d")} onClick={() => handleDecline(req.id)}>Decline</button>
                </div>
              </div>
            ))}

            <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, margin: "20px 0 12px" }}>SENT REQUESTS</div>
            {!loading && sentRequests.length === 0 && (
              <div style={{ fontSize: 13, color: "#5a4535", textAlign: "center", padding: "16px 0 20px" }}>No sent requests</div>
            )}
            {sentRequests.map(req => (
              <div key={req.id} style={s.card}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#e8d5b7" }}>{req.recipient?.display_name || req.recipient?.username}</div>
                  <div style={{ fontSize: 11, color: "#8a7055", marginTop: 2 }}>@{req.recipient?.username}</div>
                </div>
                <button style={s.btn("#a0522d")} onClick={() => handleCancelRequest(req.id)}>Cancel</button>
              </div>
            ))}
          </>
        )}

        {/* FRIENDS LIST TAB */}
        {tab === "list" && (
          <>
            <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 12 }}>
              YOUR FRIENDS ({friends.length})
            </div>
            {loading && <div style={{ fontSize: 12, color: "#7a9a7a", textAlign: "center", padding: 20 }}>Loading...</div>}
            {!loading && friends.length === 0 && (
              <div style={{ textAlign: "center", padding: 40 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🤝</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#e8d5b7", marginBottom: 8 }}>No friends yet</div>
                <div style={{ fontSize: 13, color: "#5a4535" }}>Search for friends by username or email to get started</div>
              </div>
            )}
            {friends.map(f => (
              <div key={f.id} style={{ ...s.card, cursor: "pointer" }} onClick={() => setViewingFriend(f.friendUser)}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#e8d5b7" }}>{f.friendUser?.display_name || f.friendUser?.username}</div>
                  <div style={{ fontSize: 11, color: "#8a7055", marginTop: 2 }}>@{f.friendUser?.username}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#c9a84c" }}>View Profile ›</span>
                  <button
                    style={s.btn("#5a4535")}
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
    </div>
  );
}