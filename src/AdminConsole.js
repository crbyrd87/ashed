import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const SECTIONS = [
  { id: "stats",      icon: "📊", label: "Stats" },
  { id: "users",      icon: "👤", label: "Users" },
  { id: "moderation", icon: "🚩", label: "Moderation" },
  { id: "badges",     icon: "🏅", label: "Badges" },
  { id: "database",   icon: "🗄️", label: "DB" },
  { id: "missing",    icon: "🔍", label: "Missing" },
];

export default function AdminConsole({ user, isSuperAdmin, onClose }) {
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
        {section === "users"      && <UsersSection isSuperAdmin={isSuperAdmin} currentUserId={user?.id} />}
        {section === "moderation" && <ModerationSection />}
        {section === "badges"     && <BadgesSection />}
        {section === "database"   && <DatabaseSection />}
        {section === "missing"    && <MissingCigarsSection />}
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

function UsersSection({ isSuperAdmin, currentUserId }) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userCheckins, setUserCheckins] = useState([]);
  const [actionMsg, setActionMsg] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [partnerPlaceId, setPartnerPlaceId] = useState("");

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
      .select("id, username, display_name, email, member_since, is_admin, is_super_admin, is_flagged, is_premium, is_partner, partner_place_id, location")
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

  const handleToggleAdmin = async (u) => {
    const newVal = !u.is_admin;
    const { error } = await supabase.from("users").update({ is_admin: newVal }).eq("id", u.id);
    if (error) { showMsg("Error updating admin status.", true); return; }
    const updated = { ...u, is_admin: newVal };
    setUsers(prev => prev.map(x => x.id === u.id ? updated : x));
    setSelectedUser(updated);
    showMsg(newVal ? `Admin granted to @${u.username}.` : `Admin revoked from @${u.username}.`);
  };

  const handleGrantPartner = async (u) => {
    if (!partnerPlaceId.trim()) { showMsg("Please enter a Google Place ID.", true); return; }
    const { error } = await supabase.from("users")
      .update({ is_partner: true, partner_place_id: partnerPlaceId.trim() })
      .eq("id", u.id);
    if (error) { showMsg("Error granting partner access.", true); return; }
    const updated = { ...u, is_partner: true, partner_place_id: partnerPlaceId.trim() };
    setUsers(prev => prev.map(x => x.id === u.id ? updated : x));
    setSelectedUser(updated);
    setPartnerPlaceId("");
    showMsg(`Partner access granted to @${u.username}.`);
  };

  const handleRevokePartner = async (u) => {
    const { error } = await supabase.from("users")
      .update({ is_partner: false, partner_place_id: null })
      .eq("id", u.id);
    if (error) { showMsg("Error revoking partner access.", true); return; }
    const updated = { ...u, is_partner: false, partner_place_id: null };
    setUsers(prev => prev.map(x => x.id === u.id ? updated : x));
    setSelectedUser(updated);
    showMsg(`Partner access revoked from @${u.username}.`);
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
                {selectedUser.is_super_admin && <span style={{ marginLeft: 8, color: "#e8cc7a" }}>👑 Super Admin</span>}
                {selectedUser.is_admin && <span style={{ marginLeft: 8, color: "#c9a84c" }}>⚙️ Admin</span>}
                {selectedUser.is_premium && <span style={{ marginLeft: 8, color: "#7a9a7a" }}>⭐ Premium</span>}
                {selectedUser.is_partner && <span style={{ marginLeft: 8, color: "#7a8a9a" }}>🏪 Partner</span>}
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

          {/* Partner access */}
          <div style={{ borderTop: "1px solid #3a251033", marginTop: 14, paddingTop: 14 }}>
            <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 10 }}>PARTNER ACCESS</div>
            {selectedUser.is_partner ? (
              <div>
                <div style={{ fontSize: 12, color: "#7a8a9a", marginBottom: 8 }}>
                  🏪 Active partner · Place ID: <span style={{ color: "#c8b89a", fontFamily: "monospace" }}>{selectedUser.partner_place_id || "none"}</span>
                </div>
                <button onClick={() => handleRevokePartner(selectedUser)}
                  style={{ background: "none", border: "1px solid #a0522d55", borderRadius: 8, padding: "7px 14px", color: "#a0522d", fontSize: 12, cursor: "pointer", fontFamily: SANS }}>
                  Revoke Partner Access
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={partnerPlaceId}
                  onChange={e => setPartnerPlaceId(e.target.value)}
                  placeholder="Google Place ID..."
                  style={{ flex: 1, background: "#1a0f08", border: "1px solid #4a3020", borderRadius: 8, padding: "7px 12px", color: "#e8d5b7", fontSize: 12, fontFamily: SANS, outline: "none" }}
                />
                <button onClick={() => handleGrantPartner(selectedUser)}
                  style={{ background: "linear-gradient(135deg, #7a8a9a, #5a6a7a)", border: "none", borderRadius: 8, padding: "7px 14px", color: "#e8d5b7", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: SANS, whiteSpace: "nowrap" }}>
                  🏪 Grant Partner
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            {/* Flag — blocked on admin accounts unless super admin, blocked on self */}
            {(isSuperAdmin || (!selectedUser.is_admin && selectedUser.id !== currentUserId)) && (
              <button onClick={() => handleFlag(selectedUser)}
                style={{ flex: 1, background: "none", border: `1px solid ${selectedUser.is_flagged ? "#7a9a7a55" : "#e8632a55"}`, borderRadius: 8, padding: "8px 0", color: selectedUser.is_flagged ? "#7a9a7a" : "#e8632a", fontSize: 12, cursor: "pointer", fontFamily: SANS }}>
                {selectedUser.is_flagged ? "Remove Flag" : "🚩 Flag Account"}
              </button>
            )}
            {/* Delete — blocked on admin accounts unless super admin, blocked on self */}
            {(isSuperAdmin || (!selectedUser.is_admin && selectedUser.id !== currentUserId)) && (
              <button onClick={() => setConfirmDelete(selectedUser)}
                style={{ flex: 1, background: "none", border: "1px solid #a0522d55", borderRadius: 8, padding: "8px 0", color: "#a0522d", fontSize: 12, cursor: "pointer", fontFamily: SANS }}>
                🗑 Delete Account
              </button>
            )}
            {/* Super admin only — Grant/Revoke Admin */}
            {isSuperAdmin && selectedUser.id !== currentUserId && (
              <button onClick={() => handleToggleAdmin(selectedUser)}
                style={{ flex: 1, background: "none", border: "1px solid #c9a84c44", borderRadius: 8, padding: "8px 0", color: "#c9a84c", fontSize: 12, cursor: "pointer", fontFamily: SANS }}>
                {selectedUser.is_admin ? "Revoke Admin" : "Grant Admin"}
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
              {u.is_partner && <span style={{ fontSize: 10, color: "#7a8a9a" }}>🏪</span>}
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

// ─── MODERATION SECTION ──────────────────────────────────────────────────────

function ModerationSection() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState(null);

  const showMsg = (msg, isError = false) => {
    setActionMsg({ msg, isError });
    setTimeout(() => setActionMsg(null), 3000);
  };

  useEffect(() => { loadReports(); }, []);

  const loadReports = async () => {
    setLoading(true);

    // Get all reports, grouped by comment_id with count
    const { data } = await supabase
      .from("reports")
      .select("id, comment_id, created_at, reporter:reporter_id(username), comments(id, content, user_id, checkin_id, users(username, display_name))")
      .order("created_at", { ascending: false });

    if (!data) { setLoading(false); return; }

    // Group by comment_id, keep unique comments with report count
    const grouped = {};
    for (const r of data) {
      const key = r.comment_id;
      if (!grouped[key]) {
        grouped[key] = { ...r, reportCount: 0, reportIds: [] };
      }
      grouped[key].reportCount++;
      grouped[key].reportIds.push(r.id);
    }

    setReports(Object.values(grouped).sort((a, b) => b.reportCount - a.reportCount));
    setLoading(false);
  };

  const handleRemoveComment = async (item) => {
    // Delete the comment (cascade will remove reports too)
    const { error } = await supabase.from("comments").delete().eq("id", item.comment_id);
    if (error) { showMsg("Error removing comment.", true); return; }
    setReports(prev => prev.filter(r => r.comment_id !== item.comment_id));
    showMsg("Comment removed.");
  };

  const handleDismiss = async (item) => {
    // Delete all reports for this comment without removing the comment
    const { error } = await supabase.from("reports").delete().in("id", item.reportIds);
    if (error) { showMsg("Error dismissing reports.", true); return; }
    setReports(prev => prev.filter(r => r.comment_id !== item.comment_id));
    showMsg("Reports dismissed.");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: "#c8b89a", fontWeight: 600 }}>Reported Comments</div>
        {!loading && <div style={{ fontSize: 11, color: "#7a6050" }}>{reports.length} pending</div>}
      </div>

      {actionMsg && (
        <div style={{ background: actionMsg.isError ? "#a0522d22" : "#7a9a7a22", border: `1px solid ${actionMsg.isError ? "#a0522d55" : "#7a9a7a55"}`, borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: actionMsg.isError ? "#e8a07a" : "#7a9a7a", textAlign: "center" }}>
          {actionMsg.msg}
        </div>
      )}

      {loading && <div style={{ textAlign: "center", padding: "40px 0", fontSize: 13, color: "#5a4535" }}>Loading...</div>}

      {!loading && reports.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#e8d5b7", marginBottom: 8 }}>All clear</div>
          <div style={{ fontSize: 13, color: "#5a4535" }}>No reported comments to review.</div>
        </div>
      )}

      {reports.map(item => {
        const comment = item.comments;
        const author = comment?.users;
        return (
          <div key={item.comment_id} style={{ background: "#221508", border: "1px solid #a0522d44", borderRadius: 10, padding: 14, marginBottom: 12 }}>
            {/* Report count badge */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ background: "#a0522d22", border: "1px solid #a0522d55", borderRadius: 20, padding: "2px 10px", fontSize: 11, color: "#e8a07a", fontWeight: 700 }}>
                  🚩 {item.reportCount} {item.reportCount === 1 ? "report" : "reports"}
                </span>
                <span style={{ fontSize: 11, color: "#5a4535" }}>
                  {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
            </div>

            {/* Comment author */}
            <div style={{ fontSize: 11, color: "#8a7055", marginBottom: 6 }}>
              by <span style={{ color: "#c9a84c" }}>@{author?.username || "unknown"}</span>
            </div>

            {/* Comment content */}
            <div style={{ fontSize: 14, color: "#e8d5b7", lineHeight: 1.5, background: "#2a1a0e", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
              {comment?.content || <span style={{ color: "#5a4535", fontStyle: "italic" }}>Comment not found</span>}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => handleRemoveComment(item)}
                style={{ flex: 1, background: "#a0522d", border: "none", borderRadius: 8, padding: "9px 0", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
                🗑 Remove Comment
              </button>
              <button onClick={() => handleDismiss(item)}
                style={{ flex: 1, background: "none", border: "1px solid #3a2510", borderRadius: 8, padding: "9px 0", color: "#8a7055", fontSize: 12, cursor: "pointer", fontFamily: SANS }}>
                Dismiss
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── BADGES SECTION ──────────────────────────────────────────────────────────

function BadgesSection() {
  const [badges, setBadges] = useState([]);
  const [earnedCounts, setEarnedCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userBadges, setUserBadges] = useState(new Set());
  const [searching, setSearching] = useState(false);
  const [actionMsg, setActionMsg] = useState(null);

  const showMsg = (msg, isError = false) => {
    setActionMsg({ msg, isError });
    setTimeout(() => setActionMsg(null), 3000);
  };

  useEffect(() => { loadBadges(); }, []);

  const loadBadges = async () => {
    setLoading(true);
    const [{ data: allBadges }, { data: allEarned }] = await Promise.all([
      supabase.from("badges").select("*").order("category").order("name"),
      supabase.from("user_badges").select("badge_key"),
    ]);
    setBadges(allBadges || []);
    const counts = {};
    for (const b of (allEarned || [])) {
      counts[b.badge_key] = (counts[b.badge_key] || 0) + 1;
    }
    setEarnedCounts(counts);
    setLoading(false);
  };

  const searchUsers = async () => {
    if (!userQuery.trim()) return;
    setSearching(true);
    const { data } = await supabase
      .from("users")
      .select("id, username, display_name")
      .or(`username.ilike.%${userQuery.trim()}%,display_name.ilike.%${userQuery.trim()}%`)
      .limit(10);
    setUserResults(data || []);
    setSearching(false);
  };

  const loadUserBadges = async (u) => {
    setSelectedUser(u);
    setUserResults([]);
    setUserQuery(u.username);
    const { data } = await supabase
      .from("user_badges")
      .select("badge_key")
      .eq("user_id", u.id);
    setUserBadges(new Set((data || []).map(b => b.badge_key)));
  };

  const handleAward = async (badgeKey) => {
    if (!selectedUser) return;
    const { error } = await supabase.from("user_badges").insert({
      user_id: selectedUser.id,
      badge_key: badgeKey,
      awarded_at: new Date().toISOString(),
    });
    if (error && error.message.includes("unique")) {
      showMsg("User already has this badge."); return;
    }
    if (error) { showMsg("Error awarding badge.", true); return; }
    setUserBadges(prev => new Set([...prev, badgeKey]));
    setEarnedCounts(prev => ({ ...prev, [badgeKey]: (prev[badgeKey] || 0) + 1 }));
    showMsg(`Awarded "${badgeKey}" to @${selectedUser.username}.`);
  };

  const handleRevoke = async (badgeKey) => {
    if (!selectedUser) return;
    const { error } = await supabase.from("user_badges")
      .delete()
      .eq("user_id", selectedUser.id)
      .eq("badge_key", badgeKey);
    if (error) { showMsg("Error revoking badge.", true); return; }
    setUserBadges(prev => { const s = new Set(prev); s.delete(badgeKey); return s; });
    setEarnedCounts(prev => ({ ...prev, [badgeKey]: Math.max(0, (prev[badgeKey] || 1) - 1) }));
    showMsg(`Revoked "${badgeKey}" from @${selectedUser.username}.`);
  };

  const CATEGORY_LABELS = { milestone: "Milestones", variety: "Variety", social: "Social", referral: "Referrals" };
  const CATEGORY_ORDER = ["milestone", "variety", "social", "referral"];
  const grouped = {};
  for (const b of badges) {
    if (!grouped[b.category]) grouped[b.category] = [];
    grouped[b.category].push(b);
  }

  return (
    <div>
      {/* User search */}
      <div style={{ background: "#221508", border: "1px solid #3a2510", borderRadius: 10, padding: 14, marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 10 }}>MANAGE USER BADGES</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            value={userQuery}
            onChange={e => setUserQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && searchUsers()}
            placeholder="Search by username or display name..."
            style={{ flex: 1, background: "#2a1a0e", border: "1px solid #4a3020", borderRadius: 8, padding: "9px 12px", color: "#e8d5b7", fontSize: 13, fontFamily: SANS, outline: "none" }}
          />
          <button onClick={searchUsers}
            style={{ background: "linear-gradient(135deg, #c9a84c, #a07830)", border: "none", borderRadius: 8, padding: "9px 16px", color: "#1a0f08", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
            Find
          </button>
        </div>

        {/* Search results dropdown */}
        {searching && <div style={{ fontSize: 12, color: "#5a4535", padding: "6px 0" }}>Searching...</div>}
        {userResults.map(u => (
          <div key={u.id} onClick={() => loadUserBadges(u)}
            style={{ padding: "8px 10px", background: "#2a1a0e", borderRadius: 6, marginBottom: 4, cursor: "pointer", fontSize: 13, color: "#e8d5b7" }}>
            <span style={{ color: "#c9a84c" }}>@{u.username}</span>
            {u.display_name && u.display_name !== u.username && <span style={{ color: "#8a7055", marginLeft: 8 }}>{u.display_name}</span>}
          </div>
        ))}

        {/* Selected user */}
        {selectedUser && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "#2a1a0e", borderRadius: 6, border: "1px solid #c9a84c44" }}>
            <span style={{ fontSize: 13, color: "#c9a84c" }}>@{selectedUser.username}</span>
            <span style={{ fontSize: 11, color: "#7a9a7a" }}>{userBadges.size} badges earned</span>
            <button onClick={() => { setSelectedUser(null); setUserBadges(new Set()); setUserQuery(""); }}
              style={{ background: "none", border: "none", color: "#5a4535", fontSize: 16, cursor: "pointer" }}>×</button>
          </div>
        )}
      </div>

      {/* Action message */}
      {actionMsg && (
        <div style={{ background: actionMsg.isError ? "#a0522d22" : "#7a9a7a22", border: `1px solid ${actionMsg.isError ? "#a0522d55" : "#7a9a7a55"}`, borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: actionMsg.isError ? "#e8a07a" : "#7a9a7a", textAlign: "center" }}>
          {actionMsg.msg}
        </div>
      )}

      {/* Badge list by category */}
      {loading
        ? <div style={{ textAlign: "center", padding: "30px 0", fontSize: 13, color: "#5a4535" }}>Loading badges...</div>
        : CATEGORY_ORDER.map(cat => {
          const catBadges = grouped[cat];
          if (!catBadges) return null;
          return (
            <div key={cat} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 10 }}>{CATEGORY_LABELS[cat].toUpperCase()}</div>
              {catBadges.map(b => {
                const earned = userBadges.has(b.key);
                const count = earnedCounts[b.key] || 0;
                return (
                  <div key={b.key} style={{ background: "#221508", border: `1px solid ${earned ? "#c9a84c44" : "#3a2510"}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 24, flexShrink: 0, filter: earned ? "none" : "grayscale(1)", opacity: earned ? 1 : 0.5 }}>{b.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: earned ? "#e8d5b7" : "#8a7055" }}>{b.name}</div>
                      <div style={{ fontSize: 11, color: "#5a4535", marginTop: 2 }}>{b.description}</div>
                      <div style={{ fontSize: 10, color: "#4a3525", marginTop: 3 }}>{count} user{count !== 1 ? "s" : ""} earned</div>
                    </div>
                    {selectedUser && (
                      <button
                        onClick={() => earned ? handleRevoke(b.key) : handleAward(b.key)}
                        style={{ background: earned ? "none" : "linear-gradient(135deg, #c9a84c, #a07830)", border: earned ? "1px solid #a0522d55" : "none", borderRadius: 8, padding: "6px 12px", color: earned ? "#a0522d" : "#1a0f08", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: SANS, whiteSpace: "nowrap", flexShrink: 0 }}>
                        {earned ? "Revoke" : "Award"}
                      </button>
                    )}
                    {!selectedUser && earned !== undefined && (
                      <div style={{ fontSize: 10, color: "#4a3525", flexShrink: 0 }}>Search user to manage</div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })
      }
    </div>
  );
}

function DatabaseSection() {
  const [cigars, setCigars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [msg, setMsg] = useState(null);

  useEffect(() => { loadCigars(); }, [sourceFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCigars = async () => {
    setLoading(true);
    let query = supabase.from("cigars").select("id, brand, line, vitola, strength, source").order("brand").order("line").order("vitola");
    if (sourceFilter !== "all") query = query.eq("source", sourceFilter);
    const { data } = await query;
    setCigars(data || []);
    setLoading(false);
  };

  const handleDelete = async (cigar) => {
    setDeleting(cigar.id);
    await supabase.from("cigars").delete().eq("id", cigar.id);
    setCigars(prev => prev.filter(c => c.id !== cigar.id));
    setDeleting(null);
    setMsg(`Deleted ${cigar.brand} ${cigar.line} ${cigar.vitola}`);
    setTimeout(() => setMsg(null), 3000);
  };

  const SOURCE_COLORS = {
    manual: "#7a9a7a",
    ai_generated: "#c9a84c",
    user_submitted: "#7a8a9a",
    admin_approved: "#9a7a9a",
  };

  const filtered = cigars.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.brand?.toLowerCase().includes(q) || c.line?.toLowerCase().includes(q) || c.vitola?.toLowerCase().includes(q);
  });

  return (
    <div>
      <div style={{ fontSize: 12, color: "#c8b89a", fontWeight: 600, marginBottom: 16 }}>Cigar Database</div>

      {msg && <div style={{ background: "#7a9a7a22", border: "1px solid #7a9a7a55", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#7a9a7a" }}>{msg}</div>}

      {/* Source filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {["all", "manual", "ai_generated", "user_submitted", "admin_approved"].map(s => (
          <button key={s} onClick={() => setSourceFilter(s)}
            style={{ background: sourceFilter === s ? "#c9a84c22" : "none", border: `1px solid ${sourceFilter === s ? "#c9a84c" : "#3a2510"}`, borderRadius: 20, padding: "4px 12px", color: sourceFilter === s ? "#c9a84c" : "#8a7055", fontSize: 11, cursor: "pointer", fontFamily: SANS }}>
            {s === "all" ? "All" : s.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        placeholder="Search brand, line, vitola..."
        style={{ width: "100%", background: "#2a1a0e", border: "1px solid #4a3020", borderRadius: 8, padding: "8px 12px", color: "#e8d5b7", fontSize: 13, fontFamily: SANS, outline: "none", boxSizing: "border-box", marginBottom: 12 }}
      />

      <div style={{ fontSize: 11, color: "#5a4535", marginBottom: 10 }}>{loading ? "Loading..." : `${filtered.length} cigars`}</div>

      {filtered.map(c => (
        <div key={c.id} style={{ background: "#221508", border: `1px solid ${confirmDeleteId === c.id ? "#a0522d" : "#3a2510"}`, borderRadius: 8, padding: "10px 14px", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: "#e8d5b7", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {c.brand} · {c.line} · {c.vitola}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center" }}>
                <span style={{ fontSize: 10, color: SOURCE_COLORS[c.source] || "#8a7055", background: (SOURCE_COLORS[c.source] || "#8a7055") + "22", border: `1px solid ${(SOURCE_COLORS[c.source] || "#8a7055")}55`, borderRadius: 8, padding: "1px 6px" }}>
                  {c.source || "manual"}
                </span>
                {c.strength && <span style={{ fontSize: 10, color: "#5a4535" }}>{c.strength}</span>}
              </div>
            </div>
            {confirmDeleteId === c.id ? (
              <button onClick={() => { setConfirmDeleteId(null); setDeleteConfirmText(""); }}
                style={{ background: "none", border: "1px solid #3a2510", borderRadius: 6, padding: "4px 10px", color: "#5a4535", fontSize: 11, cursor: "pointer", fontFamily: SANS, flexShrink: 0 }}>
                Cancel
              </button>
            ) : (
              <button onClick={() => { setConfirmDeleteId(c.id); setDeleteConfirmText(""); }}
                style={{ background: "none", border: "1px solid #a0522d44", borderRadius: 6, padding: "4px 10px", color: "#a0522d", fontSize: 11, cursor: "pointer", fontFamily: SANS, flexShrink: 0 }}>
                Delete
              </button>
            )}
          </div>

          {/* Type DELETE confirmation */}
          {confirmDeleteId === c.id && (
            <div style={{ marginTop: 10, borderTop: "1px solid #3a2510", paddingTop: 10 }}>
              <div style={{ fontSize: 11, color: "#a0522d", marginBottom: 6 }}>
                Type <strong>DELETE</strong> to confirm deletion of {c.brand} {c.line} {c.vitola}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  style={{ flex: 1, background: "#1a0f08", border: `1px solid ${deleteConfirmText === "DELETE" ? "#a0522d" : "#3a2510"}`, borderRadius: 6, padding: "6px 10px", color: "#e8d5b7", fontSize: 12, fontFamily: SANS, outline: "none" }}
                />
                <button
                  onClick={() => { if (deleteConfirmText === "DELETE") { handleDelete(c); setConfirmDeleteId(null); setDeleteConfirmText(""); } }}
                  disabled={deleteConfirmText !== "DELETE" || deleting === c.id}
                  style={{ background: deleteConfirmText === "DELETE" ? "#a0522d" : "#2a1a0e", border: "none", borderRadius: 6, padding: "6px 14px", color: deleteConfirmText === "DELETE" ? "#e8d5b7" : "#5a4535", fontSize: 12, fontWeight: 700, cursor: deleteConfirmText === "DELETE" ? "pointer" : "default", fontFamily: SANS, flexShrink: 0 }}>
                  {deleting === c.id ? "..." : "Confirm"}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const TASTING_NOTE_OPTIONS = [
  "Cedar", "Leather", "Earth", "Pepper", "Spice", "Coffee", "Espresso",
  "Dark Chocolate", "Cocoa", "Cream", "Nuts", "Almonds", "Cashews",
  "Dried Fruit", "Raisin", "Brown Sugar", "Caramel", "Vanilla",
  "Oak", "Toast", "Hay", "Floral", "Citrus", "Honey", "Molasses",
];

function AddCigarForm({ item, originOptions, wrapperOptions, onSave, onCancel }) {
  const [form, setForm] = useState({
    brand: item.brand || "",
    line: item.line || "",
    vitola: item.vitola || "",
    strength: "",
    origin: "",
    wrapper: "",
  });
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [saving, setSaving] = useState(false);

  const toggleNote = (note) => {
    setSelectedNotes(prev => prev.includes(note) ? prev.filter(n => n !== note) : [...prev, note]);
  };

  const handleSave = async () => {
    if (!form.brand || !form.line || !form.vitola) return;
    setSaving(true);
    await onSave({ ...form, tasting_notes: selectedNotes.join(", ") || null });
    setSaving(false);
  };

  const SelectField = ({ label, field, options }) => (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10, color: "#a08060", letterSpacing: 1, marginBottom: 3 }}>{label}</div>
      <select value={form[field] || ""} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
        style={{ width: "100%", background: "#1a0f08", border: "1px solid #5a4030", borderRadius: 6, padding: "7px 10px", color: form[field] ? "#f5ead8" : "#7a6048", fontSize: 12, fontFamily: SANS, outline: "none", boxSizing: "border-box" }}>
        <option value="">Select {label.toLowerCase()}...</option>
        {options.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>
  );

  const TextField = ({ label, field, placeholder }) => (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10, color: "#a08060", letterSpacing: 1, marginBottom: 3 }}>{label}</div>
      <input value={form[field] || ""} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
        placeholder={placeholder}
        style={{ width: "100%", background: "#1a0f08", border: "1px solid #5a4030", borderRadius: 6, padding: "7px 10px", color: "#f5ead8", fontSize: 12, fontFamily: SANS, outline: "none", boxSizing: "border-box" }} />
    </div>
  );

  return (
    <div style={{ borderTop: "1px solid #4a3520", paddingTop: 12, marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: "#d4b45a", letterSpacing: 1, marginBottom: 10 }}>ADD TO DATABASE</div>
      <TextField label="BRAND" field="brand" placeholder="Brand name" />
      <TextField label="LINE" field="line" placeholder="Line name" />
      <TextField label="VITOLA" field="vitola" placeholder="e.g. Robusto, Toro" />
      <SelectField label="STRENGTH" field="strength" options={["Light", "Medium", "Medium-Full", "Full"]} />
      <SelectField label="ORIGIN" field="origin" options={originOptions} />
      <SelectField label="WRAPPER" field="wrapper" options={wrapperOptions} />

      {/* Tasting notes bubbles */}
      <div style={{ fontSize: 10, color: "#a08060", letterSpacing: 1, marginBottom: 6 }}>TASTING NOTES</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {TASTING_NOTE_OPTIONS.map(note => (
          <button key={note} onClick={() => toggleNote(note)}
            style={{ background: selectedNotes.includes(note) ? "#d4b45a22" : "none", border: `1px solid ${selectedNotes.includes(note) ? "#d4b45a" : "#4a3520"}`, borderRadius: 20, padding: "4px 10px", color: selectedNotes.includes(note) ? "#d4b45a" : "#7a6048", fontSize: 11, cursor: "pointer", fontFamily: SANS }}>
            {note}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleSave} disabled={saving || !form.brand || !form.line || !form.vitola}
          style={{ flex: 2, background: (!saving && form.brand && form.line && form.vitola) ? "linear-gradient(135deg, #d4b45a, #a07830)" : "#2a1a0e", border: "none", borderRadius: 8, padding: "9px 0", color: (!saving && form.brand && form.line && form.vitola) ? "#1a0f08" : "#7a6048", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
          {saving ? "Saving..." : "✓ Save to DB"}
        </button>
        <button onClick={onCancel}
          style={{ flex: 1, background: "none", border: "1px solid #4a3520", borderRadius: 8, padding: "9px 0", color: "#7a6048", fontSize: 12, cursor: "pointer", fontFamily: SANS }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function MissingCigarsSection() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [dismissConfirmId, setDismissConfirmId] = useState(null);
  const [msg, setMsg] = useState(null);
  const [originOptions, setOriginOptions] = useState([]);
  const [wrapperOptions, setWrapperOptions] = useState([]);

  useEffect(() => {
    loadMissing();
    loadOptions();
  }, [showResolved]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadOptions = async () => {
    const [{ data: origins }, { data: wrappers }] = await Promise.all([
      supabase.from("cigars").select("origin").not("origin", "is", null),
      supabase.from("cigars").select("wrapper").not("wrapper", "is", null),
    ]);
    if (origins) setOriginOptions([...new Set(origins.map(r => r.origin))].sort());
    if (wrappers) setWrapperOptions([...new Set(wrappers.map(r => r.wrapper))].sort());
  };

  const loadMissing = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("missing_cigars")
      .select("*, users(username)")
      .eq("resolved", showResolved)
      .order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  const handleSaveToDb = async (item, formData) => {
    const { data: newCigar, error } = await supabase.from("cigars").insert({
      brand: formData.brand,
      line: formData.line,
      vitola: formData.vitola,
      strength: formData.strength || null,
      origin: formData.origin || null,
      wrapper: formData.wrapper || null,
      tasting_notes: formData.tasting_notes || null,
      source: "admin_approved",
    }).select().single();

    if (error) {
      setMsg({ text: "Error saving cigar.", isError: true });
      setTimeout(() => setMsg(null), 3000);
      return;
    }

    // Backfill cigar_id on any existing humidor rows that match brand/line/vitola
    await supabase.from("humidor")
      .update({ cigar_id: newCigar.id })
      .eq("cigar_brand", formData.brand)
      .eq("cigar_name", formData.line)
      .eq("cigar_vitola", formData.vitola)
      .is("cigar_id", null);

    // Backfill cigar_id on any existing checkin rows that match
    await supabase.from("checkins")
      .update({ cigar_id: newCigar.id })
      .eq("cigar_brand", formData.brand)
      .eq("cigar_name", formData.line)
      .eq("cigar_vitola", formData.vitola)
      .is("cigar_id", null);

    // Mark missing cigar as resolved
    await supabase.from("missing_cigars").update({ resolved: true }).eq("id", item.id);
    setItems(prev => prev.filter(i => i.id !== item.id));
    setAddingId(null);
    setMsg({ text: `${formData.brand} ${formData.line} ${formData.vitola} added — existing entries linked.`, isError: false });
    setTimeout(() => setMsg(null), 5000);
  };

  const handleDismiss = async (id) => {
    await supabase.from("missing_cigars").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "#c8b89a", fontWeight: 600 }}>Missing Cigars</div>
        <button onClick={() => setShowResolved(v => !v)}
          style={{ background: "none", border: "1px solid #3a2510", borderRadius: 20, padding: "4px 12px", color: "#8a7055", fontSize: 11, cursor: "pointer", fontFamily: SANS }}>
          {showResolved ? "Show Pending" : "Show Resolved"}
        </button>
      </div>

      <div style={{ fontSize: 11, color: "#5a4535", marginBottom: 12 }}>
        {showResolved ? "Cigars already added to the DB." : "Cigars scanned by users that aren't in the DB yet."}
      </div>

      {msg && (
        <div style={{ background: msg.isError ? "#a0522d22" : "#7a9a7a22", border: `1px solid ${msg.isError ? "#a0522d55" : "#7a9a7a55"}`, borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: msg.isError ? "#e8a07a" : "#7a9a7a" }}>
          {msg.text}
        </div>
      )}

      {loading && <div style={{ fontSize: 13, color: "#5a4535", textAlign: "center", padding: "20px 0" }}>Loading...</div>}

      {!loading && items.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>✅</div>
          <div style={{ fontSize: 13, color: "#5a4535" }}>{showResolved ? "No resolved items." : "No missing cigars reported."}</div>
        </div>
      )}

      {items.map(item => (
        <div key={item.id} style={{ background: "#221508", border: `1px solid ${addingId === item.id ? "#c9a84c55" : "#c9a84c22"}`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#e8d5b7", marginBottom: 4 }}>
            {item.brand} · {item.line}
          </div>
          {item.vitola && <div style={{ fontSize: 11, color: "#8a7055", marginBottom: 4 }}>Vitola: {item.vitola}</div>}
          <div style={{ fontSize: 11, color: "#5a4535", marginBottom: 10 }}>
            Reported by @{item.users?.username || "unknown"} · {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </div>

          {/* Add to DB form */}
          {addingId === item.id && (
            <AddCigarForm
              item={item}
              originOptions={originOptions}
              wrapperOptions={wrapperOptions}
              onSave={(formData) => handleSaveToDb(item, formData)}
              onCancel={() => setAddingId(null)}
            />
          )}

          {!showResolved && addingId !== item.id && (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setAddingId(item.id)}
                style={{ flex: 2, background: "linear-gradient(135deg, #d4b45a22, #d4b45a11)", border: "1px solid #d4b45a55", borderRadius: 8, padding: "7px 0", color: "#d4b45a", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
                + Add to DB
              </button>
              {dismissConfirmId === item.id ? (
                <>
                  <button onClick={() => handleDismiss(item.id)}
                    style={{ flex: 1, background: "#a0522d22", border: "1px solid #a0522d", borderRadius: 8, padding: "7px 0", color: "#e8a07a", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
                    Yes
                  </button>
                  <button onClick={() => setDismissConfirmId(null)}
                    style={{ flex: 1, background: "none", border: "1px solid #4a3520", borderRadius: 8, padding: "7px 0", color: "#7a6048", fontSize: 12, cursor: "pointer", fontFamily: SANS }}>
                    Cancel
                  </button>
                </>
              ) : (
                <button onClick={() => setDismissConfirmId(item.id)}
                  style={{ flex: 1, background: "none", border: "1px solid #4a3520", borderRadius: 8, padding: "7px 0", color: "#7a6048", fontSize: 12, cursor: "pointer", fontFamily: SANS }}>
                  Dismiss
                </button>
              )}
            </div>
          )}
          {dismissConfirmId === item.id && (
            <div style={{ fontSize: 11, color: "#e8a07a", marginTop: 6, textAlign: "center" }}>
              Are you sure you want to dismiss this cigar addition?
            </div>
          )}
        </div>
      ))}
    </div>
  );
}