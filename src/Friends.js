import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export default function Friends({ user, onClose }) {
  const [tab, setTab] = useState("find"); // find | requests | list
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState(null);
  const [refreshCount, setRefreshCount] = useState(0);

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

    // Search by username or email
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
    await supabase.from("friends").update({ status: "accepted" }).eq("id", requestId);
    refresh();
  };

  const handleDecline = async (requestId) => {
    await supabase.from("friends").delete().eq("id", requestId);
    refresh();
  };

  const handleRemoveFriend = async (friendRecord) => {
    await supabase.from("friends").delete().eq("id", friendRecord.id);
    refresh();
  };

  const s = {
    overlay: { position: "fixed", inset: 0, background: "#1a0f08", zIndex: 300, overflowY: "auto", fontFamily: SANS, color: "#e8d5b7", maxWidth: 420, margin: "0 auto" },
    header: { background: "linear-gradient(180deg, #2d1810 0%, #1a0f08 100%)", padding: "16px 20px", borderBottom: "1px solid #3a2510", display: "flex", justifyContent: "space-between", alignItems: "center" },
    tab: active => ({ flex: 1, padding: "10px 0", background: "none", border: "none", borderBottom: `2px solid ${active ? "#c9a84c" : "transparent"}`, color: active ? "#c9a84c" : "#5a4535", fontSize: 12, cursor: "pointer", fontFamily: SANS, letterSpacing: 1 }),
    input: { width: "100%", background: "#2a1a0e", border: "1px solid #4a3020", borderRadius: 8, padding: "10px 14px", color: "#e8d5b7", fontSize: 14, fontFamily: SANS, outline: "none", boxSizing: "border-box" },
    card: { background: "#2a1a0e", border: "1px solid #3a2510", borderRadius: 10, padding: "12px 14px", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" },
    btn: (color) => ({ background: "none", border: `1px solid ${color}55`, borderRadius: 8, padding: "6px 14px", color, fontSize: 12, cursor: "pointer", fontFamily: SANS, whiteSpace: "nowrap" }),
    btnFilled: { background: "linear-gradient(135deg, #c9a84c, #a07830)", border: "none", borderRadius: 8, padding: "6px 14px", color: "#1a0f08", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: SANS },
  };

  return (
    <div style={s.overlay}>
      <div style={s.header}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#e8d5b7" }}>Friends</div>
          <div style={{ fontSize: 11, color: "#8a7055", marginTop: 2 }}>
            {friends.length} friend{friends.length !== 1 ? "s" : ""}
            {pendingRequests.length > 0 && <span style={{ color: "#c9a84c", marginLeft: 8 }}>· {pendingRequests.length} pending</span>}
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#8a7055", fontSize: 24, cursor: "pointer" }}>×</button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #3a2510" }}>
        {[["find", "Find Friends"], ["requests", `Requests${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ""}`], ["list", "My Friends"]].map(([id, label]) => (
          <button key={id} style={s.tab(tab === id)} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      <div style={{ padding: 16 }}>

        {/* Success message */}
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

            {/* QR Code section */}
            <div style={{ background: "#2a1a0e", border: "1px solid #3a2510", borderRadius: 10, padding: 16, marginTop: 16, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 8 }}>YOUR FRIEND LINK</div>
              <div style={{ fontSize: 13, color: "#c9a84c", marginBottom: 8, wordBreak: "break-all" }}>
                ashed.app/u/{user.user_metadata?.username || user.id}
              </div>
              <div style={{ fontSize: 12, color: "#5a4535" }}>Share your username or this link so friends can find you</div>
            </div>
          </>
        )}

        {/* REQUESTS TAB */}
        {tab === "requests" && (
          <>
            <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 12 }}>INCOMING REQUESTS</div>
            {loading && <div style={{ fontSize: 12, color: "#7a9a7a", textAlign: "center", padding: 20 }}>Loading...</div>}
            {!loading && pendingRequests.length === 0 && (
              <div style={{ fontSize: 13, color: "#5a4535", textAlign: "center", padding: 30 }}>No pending friend requests</div>
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

            {sentRequests.length > 0 && (
              <>
                <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, margin: "20px 0 12px" }}>SENT REQUESTS</div>
                {sentRequests.map(req => (
                  <div key={req.id} style={s.card}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#e8d5b7" }}>{req.recipient?.display_name || req.recipient?.username}</div>
                      <div style={{ fontSize: 11, color: "#8a7055", marginTop: 2 }}>@{req.recipient?.username}</div>
                    </div>
                    <span style={{ fontSize: 11, color: "#5a4535" }}>Pending...</span>
                  </div>
                ))}
              </>
            )}
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
              <div key={f.id} style={s.card}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#e8d5b7" }}>{f.friendUser?.display_name || f.friendUser?.username}</div>
                  <div style={{ fontSize: 11, color: "#8a7055", marginTop: 2 }}>@{f.friendUser?.username}</div>
                </div>
                <button style={s.btn("#5a4535")} onClick={() => handleRemoveFriend(f)}>Remove</button>
              </div>
            ))}
          </>
        )}

      </div>
    </div>
  );
}