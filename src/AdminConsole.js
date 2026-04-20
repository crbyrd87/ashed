import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const SECTIONS = [
  { id: "stats",      icon: "📊", label: "Stats" },
  { id: "users",      icon: "👤", label: "Users" },
  { id: "moderation", icon: "🚩", label: "Moderation" },
  { id: "badges",     icon: "🏅", label: "Badges" },
];

export default function AdminConsole({ user, onClose }) {
  const [section, setSection] = useState("stats");

  return (
    <div style={{ position: "fixed", inset: 0, background: "#1a0f08", zIndex: 500, overflowY: "auto", fontFamily: SANS, color: "#e8d5b7", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ background: "linear-gradient(180deg, #2d1810 0%, #1a0f08 100%)", padding: "16px 20px", borderBottom: "1px solid #3a2510", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 10 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#c9a84c", letterSpacing: 2 }}>⚙️ ADMIN CONSOLE</div>
          <div style={{ fontSize: 11, color: "#8a7055", marginTop: 2, letterSpacing: 1 }}>ASHED — {user?.user_metadata?.username || user?.email}</div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#8a7055", fontSize: 26, cursor: "pointer", lineHeight: 1 }}>×</button>
      </div>
      <div style={{ display: "flex", borderBottom: "1px solid #3a2510", background: "#1a0f08", position: "sticky", top: 57, zIndex: 9 }}>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            style={{ flex: 1, padding: "12px 0", background: "none", border: "none", borderBottom: `2px solid ${section === s.id ? "#c9a84c" : "transparent"}`, color: section === s.id ? "#c9a84c" : "#5a4535", fontSize: 11, cursor: "pointer", fontFamily: SANS, letterSpacing: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 16 }}>{s.icon}</span>
            <span>{s.label.toUpperCase()}</span>
          </button>
        ))}
      </div>
      <div style={{ padding: 20 }}>
        {section === "stats"      && <StatsSection />}
        {section === "users"      && <UsersSection />}
        {section === "moderation" && <ComingSoon label="Content Moderation" />}
        {section === "badges"     && <ComingSoon label="Badge Management" />}
      </div>
    </div>
  );
}

function StatsSection() {
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ users: 0, checkins: 0, cigars: 0, fires: 0, comments: 0 });
  const [signupsByDay, setSignupsByDay] = useState([]);
  const [checkinsByDay, setCheckinsByDay] = useState([]);
  const [topCigars, setTopCigars] = useState([]);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    setLoading(true);

    const [
      { count: userCount },
      { count: checkinCount },
      { count: cigarCount },
      { count: fireCount },
      { count: commentCount },
    ] = await Promise.all([
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase.from("checkins").select("*", { count: "exact", head: true }),
      supabase.from("cigars").select("*", { count: "exact", head: true }),
      supabase.from("fires").select("*", { count: "exact", head: true }),
      supabase.from("comments").select("*", { count: "exact", head: true }),
    ]);
    setTotals({ users: userCount || 0, checkins: checkinCount || 0, cigars: cigarCount || 0, fires: fireCount || 0, comments: commentCount || 0 });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: recentUsers } = await supabase
      .from("users")
      .select("member_since")
      .gte("member_since", thirtyDaysAgo)
      .order("member_since", { ascending: true });
    setSignupsByDay(groupByDay(recentUsers || [], "member_since"));

    const { data: recentCheckins } = await supabase
      .from("checkins")
      .select("created_at")
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: true });
    setCheckinsByDay(groupByDay(recentCheckins || [], "created_at"));

    const { data: allCheckins } = await supabase
      .from("checkins")
      .select("cigar_id, cigar_name, cigar_brand, cigars(brand, line)");
    if (allCheckins) {
      const counts = {};
      for (const c of allCheckins) {
        const key = c.cigar_id || c.cigar_name || "Unknown";
        const label = c.cigars ? `${c.cigars.brand} ${c.cigars.line}` : (c.cigar_brand ? `${c.cigar_brand} ${c.cigar_name}` : "Unknown");
        if (!counts[key]) counts[key] = { label, count: 0 };
        counts[key].count++;
      }
      setTopCigars(Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 10));
    }

    setLoading(false);
  };

  if (loading) return (
    <div style={{ textAlign: "center", padding: "40px 0", fontSize: 13, color: "#5a4535" }}>Loading stats...</div>
  );

  const maxSignups  = Math.max(...signupsByDay.map(d => d.count), 1);
  const maxCheckins = Math.max(...checkinsByDay.map(d => d.count), 1);
  const maxTopCount = topCigars[0]?.count || 1;

  return (
    <div>
      {/* Stat boxes */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10, marginBottom: 28 }}>
        {[
          ["Users",        totals.users,    "#c9a84c", "👤"],
          ["Check-ins",    totals.checkins, "#7a9a7a", "🚬"],
          ["Cigars in DB", totals.cigars,   "#7a8a9a", "📋"],
          ["Fires",        totals.fires,    "#e8632a", "🔥"],
          ["Comments",     totals.comments, "#9a7a9a", "💬"],
        ].map(([label, value, color, icon]) => (
          <div key={label} style={{ background: "#221508", border: `1px solid ${color}33`, borderRadius: 12, padding: "16px 10px", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: color, opacity: 0.6, borderRadius: "12px 12px 0 0" }} />
            <div style={{ fontSize: 18, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color, letterSpacing: -0.5 }}>{value.toLocaleString()}</div>
            <div style={{ fontSize: 10, color: "#6a5540", letterSpacing: 1, marginTop: 5 }}>{label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Signups chart */}
      <div style={{ background: "#221508", border: "1px solid #3a2510", borderRadius: 12, padding: "16px 16px 12px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "#c8b89a", fontWeight: 600, letterSpacing: 0.5 }}>New Signups</div>
          <div style={{ fontSize: 11, color: "#7a6050" }}>Last 30 days</div>
        </div>
        {signupsByDay.every(d => d.count === 0)
          ? <div style={{ fontSize: 13, color: "#5a4535", textAlign: "center", padding: "20px 0" }}>No signups in this period</div>
          : <MiniBarChart data={signupsByDay} max={maxSignups} color="#c9a84c" />}
      </div>

      {/* Check-ins chart */}
      <div style={{ background: "#221508", border: "1px solid #3a2510", borderRadius: 12, padding: "16px 16px 12px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "#c8b89a", fontWeight: 600, letterSpacing: 0.5 }}>Check-ins per Day</div>
          <div style={{ fontSize: 11, color: "#7a6050" }}>Last 30 days</div>
        </div>
        {checkinsByDay.every(d => d.count === 0)
          ? <div style={{ fontSize: 13, color: "#5a4535", textAlign: "center", padding: "20px 0" }}>No check-ins in this period</div>
          : <MiniBarChart data={checkinsByDay} max={maxCheckins} color="#7a9a7a" />}
      </div>

      {/* Top cigars */}
      <div style={{ background: "#221508", border: "1px solid #3a2510", borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 12, color: "#c8b89a", fontWeight: 600, letterSpacing: 0.5, marginBottom: 16 }}>Top Cigars by Check-ins</div>
        {topCigars.length === 0
          ? <div style={{ fontSize: 13, color: "#5a4535", textAlign: "center", padding: "20px 0" }}>No data yet</div>
          : topCigars.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#5a4535", width: 16, textAlign: "right", flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "#e8d5b7", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 5 }}>{c.label}</div>
                <div style={{ height: 6, background: "#2a1a0e", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${Math.round((c.count / maxTopCount) * 100)}%`, height: "100%", background: `linear-gradient(90deg, #c9a84c, #e8cc7a)`, borderRadius: 3, transition: "width 0.3s" }} />
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#c9a84c", flexShrink: 0, minWidth: 20, textAlign: "right" }}>{c.count}</div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

function MiniBarChart({ data, max, color }) {
  // Gridline values — 25%, 50%, 75%, 100% of max
  const gridLines = [0.25, 0.5, 0.75, 1].map(f => Math.round(f * max)).filter(v => v > 0);

  return (
    <div style={{ position: "relative" }}>
      {/* Y-axis gridlines */}
      <div style={{ position: "absolute", inset: "0 0 24px 0", pointerEvents: "none" }}>
        {gridLines.map(val => (
          <div key={val} style={{ position: "absolute", left: 0, right: 0, bottom: `${Math.round((val / max) * 100)}%`, borderTop: "1px solid #5a4535", display: "flex", alignItems: "flex-end" }}>
            <span style={{ fontSize: 10, color: "#8a7060", paddingRight: 3, lineHeight: 1, transform: "translateY(50%)" }}>{val}</span>
          </div>
        ))}
      </div>

      {/* Bars */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 110, paddingLeft: 22 }}>
        {data.map((d, i) => {
          const pct = Math.round((d.count / max) * 100);
          const isZero = d.count === 0;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
              {!isZero && (
                <div style={{ fontSize: 11, color, marginBottom: 3, fontWeight: 700, opacity: 0.95 }}>{d.count}</div>
              )}
              <div
                title={`${d.label}: ${d.count}`}
                style={{
                  width: "100%",
                  borderRadius: "3px 3px 0 0",
                  height: isZero ? 2 : `${Math.max(pct, 3)}%`,
                  background: isZero
                    ? "#2a1a0e"
                    : `linear-gradient(180deg, ${color}ff 0%, ${color}99 100%)`,
                  opacity: isZero ? 0.3 : 1,
                  transition: "height 0.2s",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* X-axis dates */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, paddingLeft: 22 }}>
        <span style={{ fontSize: 11, color: "#a08060" }}>{data[0]?.label?.slice(5)}</span>
        <span style={{ fontSize: 11, color: "#a08060" }}>{data[Math.floor(data.length / 2)]?.label?.slice(5)}</span>
        <span style={{ fontSize: 11, color: "#a08060" }}>{data[data.length - 1]?.label?.slice(5)}</span>
      </div>
    </div>
  );
}

function groupByDay(records, dateField) {
  const map = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().split("T")[0];
    map[key] = 0;
  }
  for (const r of records) {
    const key = r[dateField]?.split("T")[0];
    if (key && map[key] !== undefined) map[key]++;
  }
  return Object.entries(map).map(([label, count]) => ({ label, count }));
}

// ─── USERS SECTION ───────────────────────────────────────────────────────────

function UsersSection() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userCheckins, setUserCheckins] = useState([]);
  const [actionMsg, setActionMsg] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const showMsg = (msg, isError = false) => {
    setActionMsg({ msg, isError });
    setTimeout(() => setActionMsg(null), 3000);
  };

  const searchUsers = async () => {
    setLoading(true);
    setSelectedUser(null);
    const q = query.trim();
    let req = supabase
      .from("users")
      .select("id, username, display_name, email, member_since, is_admin, is_flagged, is_premium, location")
      .order("member_since", { ascending: false })
      .limit(50);
    if (q) req = req.or(`username.ilike.%${q}%,email.ilike.%${q}%,display_name.ilike.%${q}%`);
    const { data } = await req;
    setUsers(data || []);
    setLoading(false);
  };

  const loadUserDetail = async (u) => {
    setSelectedUser(u);
    const { data } = await supabase
      .from("checkins")
      .select("id, created_at, cigar_name, cigar_brand, rating, cigars(brand, line)")
      .eq("user_id", u.id)
      .order("created_at", { ascending: false })
      .limit(10);
    setUserCheckins(data || []);
  };

  const handleFlag = async (u) => {
    const newVal = !u.is_flagged;
    const { error } = await supabase.from("users").update({ is_flagged: newVal }).eq("id", u.id);
    if (error) { showMsg("Error updating flag.", true); return; }
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_flagged: newVal } : x));
    if (selectedUser?.id === u.id) setSelectedUser(prev => ({ ...prev, is_flagged: newVal }));
    showMsg(newVal ? "Account flagged." : "Flag removed.");
  };

  const handleDelete = async (u) => {
    const { error } = await supabase.from("users").delete().eq("id", u.id);
    if (error) { showMsg("Error deleting user.", true); setConfirmDelete(null); return; }
    setUsers(prev => prev.filter(x => x.id !== u.id));
    setSelectedUser(null);
    setConfirmDelete(null);
    showMsg("User deleted.");
  };

  // Load all users on mount
  useEffect(() => { searchUsers(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      {/* Search bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && searchUsers()}
          placeholder="Search by username, email, or name..."
          style={{ flex: 1, background: "#2a1a0e", border: "1px solid #4a3020", borderRadius: 8, padding: "10px 14px", color: "#e8d5b7", fontSize: 14, fontFamily: SANS, outline: "none" }}
        />
        <button onClick={searchUsers}
          style={{ background: "linear-gradient(135deg, #c9a84c, #a07830)", border: "none", borderRadius: 8, padding: "10px 18px", color: "#1a0f08", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
          Search
        </button>
      </div>

      {/* Action message */}
      {actionMsg && (
        <div style={{ background: actionMsg.isError ? "#a0522d22" : "#7a9a7a22", border: `1px solid ${actionMsg.isError ? "#a0522d55" : "#7a9a7a55"}`, borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: actionMsg.isError ? "#e8a07a" : "#7a9a7a", textAlign: "center" }}>
          {actionMsg.msg}
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div style={{ background: "#2a1a0e", border: "1px solid #a0522d55", borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 14, color: "#e8d5b7", marginBottom: 12 }}>
            Delete <strong style={{ color: "#e8632a" }}>@{confirmDelete.username}</strong>? This cannot be undone. All their check-ins, ratings, and data will be removed.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => handleDelete(confirmDelete)}
              style={{ flex: 1, background: "#a0522d", border: "none", borderRadius: 8, padding: "10px 0", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
              Yes, Delete
            </button>
            <button onClick={() => setConfirmDelete(null)}
              style={{ flex: 1, background: "none", border: "1px solid #3a2510", borderRadius: 8, padding: "10px 0", color: "#8a7055", fontSize: 13, cursor: "pointer", fontFamily: SANS }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading && <div style={{ textAlign: "center", padding: "30px 0", fontSize: 13, color: "#5a4535" }}>Loading...</div>}

      {/* User detail panel */}
      {selectedUser && (
        <div style={{ background: "#2a1a0e", border: "1px solid #c9a84c44", borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#e8d5b7" }}>{selectedUser.display_name || selectedUser.username}</div>
              <div style={{ fontSize: 12, color: "#8a7055", marginTop: 2 }}>@{selectedUser.username} · {selectedUser.email}</div>
              <div style={{ fontSize: 11, color: "#5a4535", marginTop: 4 }}>
                Joined {new Date(selectedUser.member_since || selectedUser.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                {selectedUser.is_admin && <span style={{ marginLeft: 8, color: "#c9a84c" }}>⚙️ Admin</span>}
                {selectedUser.is_premium && <span style={{ marginLeft: 8, color: "#7a9a7a" }}>⭐ Premium</span>}
                {selectedUser.is_flagged && <span style={{ marginLeft: 8, color: "#e8632a" }}>🚩 Flagged</span>}
              </div>
            </div>
            <button onClick={() => setSelectedUser(null)}
              style={{ background: "none", border: "none", color: "#5a4535", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
          </div>

          {/* Recent check-ins */}
          <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 8 }}>RECENT CHECK-INS ({userCheckins.length})</div>
          {userCheckins.length === 0
            ? <div style={{ fontSize: 12, color: "#5a4535", marginBottom: 12 }}>No check-ins yet</div>
            : userCheckins.slice(0, 5).map(c => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #3a251022", fontSize: 12 }}>
                <span style={{ color: "#c8b89a" }}>{c.cigars ? `${c.cigars.brand} ${c.cigars.line}` : `${c.cigar_brand || ""} ${c.cigar_name || ""}`}</span>
                <span style={{ color: "#c9a84c", flexShrink: 0, marginLeft: 8 }}>{c.rating ?? "—"}</span>
              </div>
            ))
          }

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button onClick={() => handleFlag(selectedUser)}
              style={{ flex: 1, background: "none", border: `1px solid ${selectedUser.is_flagged ? "#7a9a7a55" : "#e8632a55"}`, borderRadius: 8, padding: "8px 0", color: selectedUser.is_flagged ? "#7a9a7a" : "#e8632a", fontSize: 12, cursor: "pointer", fontFamily: SANS }}>
              {selectedUser.is_flagged ? "Remove Flag" : "🚩 Flag Account"}
            </button>
            {!selectedUser.is_admin && (
              <button onClick={() => setConfirmDelete(selectedUser)}
                style={{ flex: 1, background: "none", border: "1px solid #a0522d55", borderRadius: 8, padding: "8px 0", color: "#a0522d", fontSize: 12, cursor: "pointer", fontFamily: SANS }}>
                🗑 Delete Account
              </button>
            )}
          </div>
        </div>
      )}

      {/* User list */}
      {!loading && users.length === 0 && (
        <div style={{ textAlign: "center", padding: "30px 0", fontSize: 13, color: "#5a4535" }}>No users found</div>
      )}
      {users.map(u => (
        <div key={u.id}
          onClick={() => loadUserDetail(u)}
          style={{ background: selectedUser?.id === u.id ? "#2a1a0e" : "#1e1208", border: `1px solid ${selectedUser?.id === u.id ? "#c9a84c44" : "#3a2510"}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#e8d5b7", display: "flex", alignItems: "center", gap: 6 }}>
              {u.display_name || u.username}
              {u.is_admin && <span style={{ fontSize: 10, color: "#c9a84c" }}>⚙️</span>}
              {u.is_flagged && <span style={{ fontSize: 10, color: "#e8632a" }}>🚩</span>}
            </div>
            <div style={{ fontSize: 11, color: "#8a7055", marginTop: 2 }}>@{u.username} · {u.email}</div>
          </div>
          <div style={{ fontSize: 11, color: "#5a4535", flexShrink: 0, marginLeft: 8 }}>
            {new Date(u.member_since || u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </div>
        </div>
      ))}
    </div>
  );
}

const ComingSoon = ({ label }) => (
  <div style={{ textAlign: "center", padding: "60px 20px" }}>
    <div style={{ fontSize: 36, marginBottom: 16 }}>🚧</div>
    <div style={{ fontSize: 15, fontWeight: 700, color: "#e8d5b7", marginBottom: 8 }}>{label}</div>
    <div style={{ fontSize: 13, color: "#5a4535" }}>Coming in the next build step.</div>
  </div>
);