import { useState, useEffect } from "react";
import { SANS, color, font, layout, radius, type, weight } from "./theme";
import { CloseButton, Icon, Pill, Pressable, Screen, SectionLabel } from "./ui";
import { supabase } from "./supabase";

// Grouped for the rail. Eleven tabs never fit on one row — they wrapped or
// scrolled — and the emoji beside them carried no information: a magnifying
// glass for "Missing" and a tick for "QA" are decoration, not wayfinding.
const GROUPS = [
  { title: "Overview", ids: ["stats", "users", "audit"] },
  { title: "Queues",   ids: ["moderation", "missing", "feedback", "qa", "dedup"] },
  { title: "Data",     ids: ["database", "badges", "refresh"] },
];

const LABELS = {
  stats: "Stats",
  users: "Users",
  audit: "Audit",
  moderation: "Moderation",
  missing: "Missing",
  feedback: "Feedback",
  qa: "QA",
  dedup: "Dedup",
  database: "Database",
  badges: "Badges",
  refresh: "Refresh",
};

const logAction = async (action, targetType, targetId, performedBy, notes) => {
  await supabase.from("audit_log").insert({
    action,
    target_type: targetType,
    target_id: String(targetId || ""),
    performed_by: performedBy || null,
    notes: notes || null,
  });
};

export default function AdminConsole({ user, isSuperAdmin, isModerator, onClose }) {
  const [section, setSection] = useState(isModerator ? "moderation" : "stats");
  const [reportCount, setReportCount] = useState(null);

  // The only rail count worth fetching. Every other section derives its list
  // with joins and grouping, so a count beside it would mean running the query
  // twice; this one is a single head request.
  useEffect(() => {
    supabase.from("reports").select("*", { count: "exact", head: true })
      .then(({ count }) => setReportCount(count || 0));
  }, []);

  // Moderators only see the Moderation queue, and when that is all they see
  // the other group headings would sit above nothing.
  const groups = isModerator
    ? [{ title: "Queues", ids: ["moderation"] }]
    : GROUPS;

  return (
    <Screen zIndex={650} maxWidth={layout.adminWidth}>
      {/* Mauve, not gold: gold belongs to the member-facing app, so the accent
          alone tells you which surface you are looking at. */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        display: "flex", alignItems: "center", gap: 12,
        padding: "0 12px", height: 56,
        background: color.bg, borderBottom: `1px solid ${color.border}`,
      }}>
        <Icon.Settings size={21} color={color.admin} />
        <div style={{ flex: 1, minWidth: 0, fontFamily: font.display, fontSize: type.lg, fontWeight: weight.displayMed, color: color.textPrimary }}>
          Admin console
        </div>
        <div style={{ fontSize: type.sm, color: color.textMuted, marginRight: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }}>
          {user?.user_metadata?.username || user?.email}
        </div>
        <CloseButton onClose={onClose} />
      </div>

      {/* Narrow screens get a select, not a scrolling tab strip — which is
          what eleven tabs became before. */}
      <div className="admin-narrow" style={{ padding: "12px 16px 0" }}>
        <select
          value={section}
          onChange={e => setSection(e.target.value)}
          aria-label="Section"
          style={{
            width: "100%", height: 44, boxSizing: "border-box",
            background: color.surfaceRaised, border: `1px solid ${color.borderStrong}`,
            borderRadius: radius.sm, padding: "0 12px",
            color: color.textPrimary, fontSize: type.md, fontFamily: font.sans,
          }}
        >
          {groups.map(g => (
            <optgroup key={g.title} label={g.title}>
              {g.ids.map(id => <option key={id} value={id}>{LABELS[id]}</option>)}
            </optgroup>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start" }}>
        <nav className="admin-rail" style={{
          width: 208, flexShrink: 0,
          borderRight: `1px solid ${color.border}`,
          padding: "8px 12px 24px",
          minHeight: "calc(100vh - 56px)",
        }}>
          {groups.map(g => (
            <div key={g.title} style={{ marginBottom: 18 }}>
              <SectionLabel style={{ padding: "0 10px", marginBottom: 6 }}>{g.title}</SectionLabel>
              {g.ids.map(id => {
                const active = section === id;
                return (
                  <Pressable
                    key={id}
                    minHeight={44}
                    onClick={() => setSection(id)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "0 10px", borderRadius: radius.sm,
                      background: active ? color.surface : "none",
                      boxShadow: active ? `inset 2px 0 0 ${color.admin}` : "none",
                      color: active ? color.textPrimary : color.textMuted,
                      fontSize: type.md,
                    }}
                  >
                    {LABELS[id]}
                    {id === "moderation" && reportCount > 0 && (
                      <span style={{ fontFamily: font.mono, fontSize: type.sm, color: color.danger }}>{reportCount}</span>
                    )}
                  </Pressable>
                );
              })}
            </div>
          ))}
        </nav>

        <div style={{ flex: 1, minWidth: 0, padding: 20 }}>
          {section === "stats"      && <StatsSection />}
          {section === "users"      && <UsersSection isSuperAdmin={isSuperAdmin} currentUserId={user?.id} />}
          {section === "moderation" && <ModerationSection />}
          {section === "badges"     && <BadgesSection />}
          {section === "database"   && <DatabaseSection />}
          {section === "missing"    && <MissingCigarsSection currentUserId={user?.id} />}
          {section === "feedback"   && <FeedbackSection currentUser={user} />}
          {section === "refresh"    && <DbRefreshSection />}
          {section === "qa"         && <QASection currentUserId={user?.id} />}
          {section === "dedup"      && <DedupSection currentUserId={user?.id} />}
          {section === "audit"      && <AuditSection />}
        </div>
      </div>
    </Screen>
  );
}

function StatsSection() {
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ users: 0, checkins: 0, cigars: 0, fires: 0, comments: 0, mau: 0 });
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

    // Distinct users who did ANYTHING in the last 30 days — logged a smoke,
    // liked a check-in, or commented. Counting check-ins alone missed people
    // who read the feed and engage with it without logging their own smokes.
    //
    // Union in JS rather than SQL: the three tables have no shared view, and
    // a user active in all three must still count once.
    const [mauCheckins, mauFires, mauComments] = await Promise.all([
      supabase.from("checkins").select("user_id").gte("created_at", thirtyDaysAgo),
      supabase.from("fires").select("user_id").gte("created_at", thirtyDaysAgo),
      supabase.from("comments").select("user_id").gte("created_at", thirtyDaysAgo),
    ]);
    const activeIds = new Set();
    for (const res of [mauCheckins, mauFires, mauComments]) {
      for (const r of res.data || []) if (r.user_id) activeIds.add(r.user_id);
    }
    setTotals(prev => ({ ...prev, mau: activeIds.size }));

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
        // cigars holds one row per vitola, so keying on cigar_id split a single
        // line into one entry per size — three separate "Padron 1926 Series"
        // rows. Key on the brand + line label instead so vitolas merge.
        const label = c.cigars
          ? [c.cigars.brand, c.cigars.line].filter(Boolean).join(" ")
          : [c.cigar_brand, c.cigar_name].filter(Boolean).join(" ");
        const name = label.trim() || "Unknown";
        const key = name.toLowerCase();
        if (!counts[key]) counts[key] = { label: name, count: 0 };
        counts[key].count++;
      }
      setTopCigars(Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 10));
    }

    setLoading(false);
  };

  if (loading) return (
    <div style={{ textAlign: "center", padding: "40px 0", fontSize: 13, color: color.faint }}>Loading stats...</div>
  );

  const maxSignups  = Math.max(...signupsByDay.map(d => d.count), 1);
  const maxCheckins = Math.max(...checkinsByDay.map(d => d.count), 1);
  const maxTopCount = topCigars[0]?.count || 1;

  return (
    <div>
      {/* Stat boxes */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10, marginBottom: 28 }}>
        {[
          ["Users",        totals.users,    color.textPrimary],
          ["Active (30d)", totals.mau,      color.textPrimary],
          ["Check-ins",    totals.checkins, color.textPrimary],
          ["Cigars in DB", totals.cigars,   color.textPrimary],
          ["Likes",        totals.fires,    color.textPrimary],
          ["Comments",     totals.comments, color.textPrimary],
        ].map(([label, value, accent, icon]) => (
          <div key={label} style={{ background: color.surface, border: `1px solid ${accent}33`, borderRadius: 12, padding: "16px 10px", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent, opacity: 0.6, borderRadius: "12px 12px 0 0" }} />
            <div style={{ fontSize: 18, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: accent, letterSpacing: -0.5 }}>{value.toLocaleString()}</div>
            <div style={{ fontSize: type.xs, color: "#6a5540", letterSpacing: 1, marginTop: 5 }}>{label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Signups chart */}
      <div style={{ background: color.surface, border: `1px solid ${color.line}`, borderRadius: 12, padding: "16px 16px 12px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
          <div style={{ fontSize: type.xs, color: color.cream, fontWeight: 600, letterSpacing: 0.5 }}>New Signups</div>
          <div style={{ fontSize: type.xs, color: color.dimAlt }}>Last 30 days</div>
        </div>
        {signupsByDay.every(d => d.count === 0)
          ? <div style={{ fontSize: 13, color: color.faint, textAlign: "center", padding: "20px 0" }}>No signups in this period</div>
          : <MiniBarChart data={signupsByDay} max={maxSignups} color={color.gold} />}
      </div>

      {/* Check-ins chart */}
      <div style={{ background: color.surface, border: `1px solid ${color.line}`, borderRadius: 12, padding: "16px 16px 12px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
          <div style={{ fontSize: type.xs, color: color.cream, fontWeight: 600, letterSpacing: 0.5 }}>Check-ins per Day</div>
          <div style={{ fontSize: type.xs, color: color.dimAlt }}>Last 30 days</div>
        </div>
        {checkinsByDay.every(d => d.count === 0)
          ? <div style={{ fontSize: 13, color: color.faint, textAlign: "center", padding: "20px 0" }}>No check-ins in this period</div>
          : <MiniBarChart data={checkinsByDay} max={maxCheckins} color={color.green} />}
      </div>

      {/* Top cigars */}
      <div style={{ background: color.surface, border: `1px solid ${color.line}`, borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: type.xs, color: color.cream, fontWeight: 600, letterSpacing: 0.5, marginBottom: 16 }}>Top Cigars by Check-ins</div>
        {topCigars.length === 0
          ? <div style={{ fontSize: 13, color: color.faint, textAlign: "center", padding: "20px 0" }}>No data yet</div>
          : topCigars.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ fontSize: type.xs, color: color.faint, width: 16, textAlign: "right", flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: color.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 5 }}>{c.label}</div>
                <div style={{ height: 6, background: color.surfaceRaised, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${Math.round((c.count / maxTopCount) * 100)}%`, height: "100%", background: color.gold, borderRadius: 3, transition: "width 0.3s" }} />
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: color.gold, flexShrink: 0, minWidth: 20, textAlign: "right" }}>{c.count}</div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// Pick an axis step that yields evenly spaced, round tick labels.
// Labelling fixed fractions of the max and rounding each one produced scales
// like 2 / 4 / 5 / 7: the gridlines were evenly spaced but their labels were
// not, so the axis read as data rather than as a scale.
function niceScale(max) {
  const rough = Math.max(max, 1) / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  const mult = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  // Check-in counts are whole numbers, so never label a fractional step.
  const step = Math.max(1, Math.round(mult * mag));
  const top = Math.max(step, Math.ceil(max / step) * step);
  const ticks = [];
  for (let v = step; v <= top; v += step) ticks.push(v);
  return { top, ticks };
}

function MiniBarChart({ data, max, color: accent }) {
  // Bars are measured against the rounded-up axis top, not the raw max, so a
  // bar lines up with its gridline.
  const { top: axisTop, ticks } = niceScale(max);

  return (
    <div style={{ position: "relative" }}>
      {/* Y-axis gridlines */}
      <div style={{ position: "absolute", inset: "0 0 24px 0", pointerEvents: "none" }}>
        {ticks.map(val => (
          <div key={val} style={{ position: "absolute", left: 0, right: 0, bottom: `${Math.round((val / axisTop) * 100)}%`, borderTop: `1px solid ${color.faint}`, display: "flex", alignItems: "flex-end" }}>
            <span style={{ fontSize: type.xs, color: "#8a7060", paddingRight: 3, lineHeight: 1, transform: "translateY(50%)" }}>{val}</span>
          </div>
        ))}
      </div>

      {/* Bars */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 110, paddingLeft: 22 }}>
        {data.map((d, i) => {
          const pct = Math.round((d.count / axisTop) * 100);
          const isZero = d.count === 0;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
              {!isZero && (
                <div style={{ fontSize: type.xs, color: accent, marginBottom: 3, fontWeight: 700, opacity: 0.95 }}>{d.count}</div>
              )}
              <div
                title={`${d.label}: ${d.count}`}
                style={{
                  width: "100%",
                  borderRadius: "3px 3px 0 0",
                  height: isZero ? 2 : `${Math.max(pct, 3)}%`,
                  background: isZero
                    ? color.surfaceRaised
                    : accent,
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
        <span style={{ fontSize: type.xs, color: color.tan }}>{data[0]?.label?.slice(5)}</span>
        <span style={{ fontSize: type.xs, color: color.tan }}>{data[Math.floor(data.length / 2)]?.label?.slice(5)}</span>
        <span style={{ fontSize: type.xs, color: color.tan }}>{data[data.length - 1]?.label?.slice(5)}</span>
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
      .select("id, username, display_name, email, member_since, is_admin, is_super_admin, is_moderator, is_flagged, is_premium, is_partner, partner_place_id, location")
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
    await logAction("delete_user", "user", u.id, currentUserId, `@${u.username}`);
    setUsers(prev => prev.filter(x => x.id !== u.id));
    setSelectedUser(null);
    setConfirmDelete(null);
    showMsg("User deleted.");
  };

  const handleToggleAdmin = async (u) => {
    const newVal = !u.is_admin;
    const { error } = await supabase.from("users").update({ is_admin: newVal }).eq("id", u.id);
    if (error) { showMsg("Error updating admin status.", true); return; }
    await logAction(newVal ? "grant_admin" : "revoke_admin", "user", u.id, currentUserId, `@${u.username}`);
    const updated = { ...u, is_admin: newVal };
    setUsers(prev => prev.map(x => x.id === u.id ? updated : x));
    setSelectedUser(updated);
    showMsg(newVal ? `Admin granted to @${u.username}.` : `Admin revoked from @${u.username}.`);
  };

  const handleToggleModerator = async (u) => {
    const newVal = !u.is_moderator;
    const { error } = await supabase.from("users").update({ is_moderator: newVal }).eq("id", u.id);
    if (error) { showMsg("Error updating moderator status.", true); return; }
    await logAction(newVal ? "grant_mod" : "revoke_mod", "user", u.id, currentUserId, `@${u.username}`);
    const updated = { ...u, is_moderator: newVal };
    setUsers(prev => prev.map(x => x.id === u.id ? updated : x));
    setSelectedUser(updated);
    showMsg(newVal ? `Moderator role granted to @${u.username}.` : `Moderator role revoked from @${u.username}.`);
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
          style={{ flex: 1, background: color.surfaceRaised, border: `1px solid ${color.lineInput}`, borderRadius: 8, padding: "10px 14px", color: color.text, fontSize: type.md, fontFamily: SANS, outline: "none" }}
        />
        <button onClick={searchUsers}
          style={{ background: color.gold, border: "none", borderRadius: 8, padding: "10px 18px", color: color.bg, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
          Search
        </button>
      </div>

      {/* Action message */}
      {actionMsg && (
        <div style={{ background: actionMsg.isError ? `${color.danger}22` : `${color.green}22`, border: `1px solid ${actionMsg.isError ? `${color.danger}55` : `${color.green}55`}`, borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: actionMsg.isError ? color.dangerText : color.green, textAlign: "center" }}>
          {actionMsg.msg}
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div style={{ background: color.surfaceRaised, border: `1px solid ${color.danger}55`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 14, color: color.text, marginBottom: 12 }}>
            Delete <strong style={{ color: color.alert }}>@{confirmDelete.username}</strong>? This cannot be undone. All their check-ins, ratings, and data will be removed.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => handleDelete(confirmDelete)}
              style={{ flex: 1, background: color.danger, border: "none", borderRadius: 8, padding: "10px 0", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
              Yes, Delete
            </button>
            <button onClick={() => setConfirmDelete(null)}
              style={{ flex: 1, background: "none", border: `1px solid ${color.line}`, borderRadius: 8, padding: "10px 0", color: color.muted, fontSize: 13, cursor: "pointer", fontFamily: SANS }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading && <div style={{ textAlign: "center", padding: "30px 0", fontSize: 13, color: color.faint }}>Loading...</div>}

      {/* User detail panel */}
      {selectedUser && (
        <div style={{ background: color.surfaceRaised, border: `1px solid ${color.gold}44`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: color.text }}>{selectedUser.display_name || selectedUser.username}</div>
              <div style={{ fontSize: type.xs, color: color.muted, marginTop: 2 }}>@{selectedUser.username} · {selectedUser.email}</div>
              <div style={{ fontSize: type.xs, color: color.faint, marginTop: 4 }}>
                Joined {new Date(selectedUser.member_since || selectedUser.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                {selectedUser.is_super_admin && <span style={{ marginLeft: 8, color: color.goldPale }}>Super admin</span>}
                {selectedUser.is_admin && <span style={{ marginLeft: 8, color: color.gold }}>Admin</span>}
                {selectedUser.is_moderator && <span style={{ marginLeft: 8, color: color.partner }}>Mod</span>}
                {selectedUser.is_premium && <span style={{ marginLeft: 8, color: color.green }}>Premium</span>}
                {selectedUser.is_partner && <span style={{ marginLeft: 8, color: color.partner }}>Partner</span>}
                {selectedUser.is_flagged && <span style={{ marginLeft: 8, color: color.alert }}>Flagged</span>}
              </div>
            </div>
            <button onClick={() => setSelectedUser(null)}
              style={{ background: "none", border: "none", color: color.faint, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
          </div>

          {/* Recent check-ins */}
          <div style={{ fontSize: type.xs, color: color.muted, letterSpacing: 1, marginBottom: 8 }}>RECENT CHECK-INS ({userCheckins.length})</div>
          {userCheckins.length === 0
            ? <div style={{ fontSize: type.xs, color: color.faint, marginBottom: 12 }}>No check-ins yet</div>
            : userCheckins.slice(0, 5).map(c => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${color.line}22`, fontSize: type.xs }}>
                <span style={{ color: color.cream }}>{c.cigars ? `${c.cigars.brand} ${c.cigars.line}` : `${c.cigar_brand || ""} ${c.cigar_name || ""}`}</span>
                <span style={{ color: color.gold, flexShrink: 0, marginLeft: 8 }}>{c.rating ?? "—"}</span>
              </div>
            ))
          }

          {/* Partner access */}
          <div style={{ borderTop: `1px solid ${color.line}33`, marginTop: 14, paddingTop: 14 }}>
            <div style={{ fontSize: type.xs, color: color.muted, letterSpacing: 1, marginBottom: 10 }}>PARTNER ACCESS</div>
            {selectedUser.is_partner ? (
              <div>
                <div style={{ fontSize: type.xs, color: color.partner, marginBottom: 8 }}>
                  Active partner · Place ID: <span style={{ color: color.cream, fontFamily: "monospace" }}>{selectedUser.partner_place_id || "none"}</span>
                </div>
                <button onClick={() => handleRevokePartner(selectedUser)}
                  style={{ background: "none", border: `1px solid ${color.danger}55`, borderRadius: 8, padding: "7px 14px", color: color.danger, fontSize: type.xs, cursor: "pointer", fontFamily: SANS }}>
                  Revoke Partner Access
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={partnerPlaceId}
                  onChange={e => setPartnerPlaceId(e.target.value)}
                  placeholder="Google Place ID..."
                  style={{ flex: 1, background: color.bg, border: `1px solid ${color.lineInput}`, borderRadius: 8, padding: "7px 12px", color: color.text, fontSize: type.md, fontFamily: SANS, outline: "none" }}
                />
                <button onClick={() => handleGrantPartner(selectedUser)}
                  style={{ background: color.partner, border: "none", borderRadius: 8, padding: "7px 14px", color: color.text, fontSize: type.xs, fontWeight: 700, cursor: "pointer", fontFamily: SANS, whiteSpace: "nowrap" }}>
                  Grant partner
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            {/* Flag — blocked on admin accounts unless super admin, blocked on self */}
            {(isSuperAdmin || (!selectedUser.is_admin && selectedUser.id !== currentUserId)) && (
              <button onClick={() => handleFlag(selectedUser)}
                style={{ flex: 1, background: "none", border: `1px solid ${selectedUser.is_flagged ? `${color.green}55` : `${color.alert}55`}`, borderRadius: 8, padding: "8px 0", color: selectedUser.is_flagged ? color.green : color.alert, fontSize: type.xs, cursor: "pointer", fontFamily: SANS }}>
                {selectedUser.is_flagged ? "Remove flag" : "Flag account"}
              </button>
            )}
            {/* Delete — blocked on admin accounts unless super admin, blocked on self */}
            {(isSuperAdmin || (!selectedUser.is_admin && selectedUser.id !== currentUserId)) && (
              <button onClick={() => setConfirmDelete(selectedUser)}
                style={{ flex: 1, background: "none", border: `1px solid ${color.danger}55`, borderRadius: 8, padding: "8px 0", color: color.danger, fontSize: type.xs, cursor: "pointer", fontFamily: SANS }}>
                Delete account
              </button>
            )}
            {/* Super admin only — Grant/Revoke Admin */}
            {isSuperAdmin && selectedUser.id !== currentUserId && (
              <button onClick={() => handleToggleAdmin(selectedUser)}
                style={{ flex: 1, background: "none", border: `1px solid ${color.gold}44`, borderRadius: 8, padding: "8px 0", color: color.gold, fontSize: type.xs, cursor: "pointer", fontFamily: SANS }}>
                {selectedUser.is_admin ? "Revoke Admin" : "Grant Admin"}
              </button>
            )}
            {/* Super admin only — Grant/Revoke Moderator */}
            {isSuperAdmin && selectedUser.id !== currentUserId && !selectedUser.is_admin && (
              <button onClick={() => handleToggleModerator(selectedUser)}
                style={{ flex: 1, background: "none", border: `1px solid ${color.partner}44`, borderRadius: 8, padding: "8px 0", color: color.partner, fontSize: type.xs, cursor: "pointer", fontFamily: SANS }}>
                {selectedUser.is_moderator ? "Revoke Mod" : "Grant Mod"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* User list */}
      {!loading && users.length === 0 && (
        <div style={{ textAlign: "center", padding: "30px 0", fontSize: 13, color: color.faint }}>No users found</div>
      )}
      {users.map(u => (
        <div key={u.id}
          onClick={() => loadUserDetail(u)}
          style={{ background: selectedUser?.id === u.id ? color.surfaceRaised : color.surfaceSunken, border: `1px solid ${selectedUser?.id === u.id ? `${color.gold}44` : color.line}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: color.text, display: "flex", alignItems: "center", gap: 6 }}>
              {u.display_name || u.username}
              {u.is_admin && <Pill size="sm">Admin</Pill>}
              {u.is_partner && <Pill size="sm">Partner</Pill>}
              {u.is_flagged && <Pill size="sm">Flagged</Pill>}
            </div>
            <div style={{ fontSize: type.xs, color: color.muted, marginTop: 2 }}>@{u.username} · {u.email}</div>
          </div>
          <div style={{ fontSize: type.xs, color: color.faint, flexShrink: 0, marginLeft: 8 }}>
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
        <div style={{ fontSize: type.xs, color: color.cream, fontWeight: 600 }}>Reported Comments</div>
        {!loading && <div style={{ fontSize: type.xs, color: color.dimAlt }}>{reports.length} pending</div>}
      </div>

      {actionMsg && (
        <div style={{ background: actionMsg.isError ? `${color.danger}22` : `${color.green}22`, border: `1px solid ${actionMsg.isError ? `${color.danger}55` : `${color.green}55`}`, borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: actionMsg.isError ? color.dangerText : color.green, textAlign: "center" }}>
          {actionMsg.msg}
        </div>
      )}

      {loading && <div style={{ textAlign: "center", padding: "40px 0", fontSize: 13, color: color.faint }}>Loading...</div>}

      {!loading && reports.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}><Icon.Check size={32} color={color.borderStrong} /></div>
          <div style={{ fontSize: 15, fontWeight: 700, color: color.text, marginBottom: 8 }}>All clear</div>
          <div style={{ fontSize: 13, color: color.faint }}>No reported comments to review.</div>
        </div>
      )}

      {reports.map(item => {
        const comment = item.comments;
        const author = comment?.users;
        return (
          <div key={item.comment_id} style={{ background: color.surface, border: `1px solid ${color.danger}44`, borderRadius: 10, padding: 14, marginBottom: 12 }}>
            {/* Report count badge */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ background: `${color.danger}22`, border: `1px solid ${color.danger}55`, borderRadius: 20, padding: "2px 10px", fontSize: type.xs, color: color.dangerText, fontWeight: 700 }}>
                  {item.reportCount} {item.reportCount === 1 ? "report" : "reports"}
                </span>
                <span style={{ fontSize: type.xs, color: color.faint }}>
                  {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
            </div>

            {/* Comment author */}
            <div style={{ fontSize: type.xs, color: color.muted, marginBottom: 6 }}>
              by <span style={{ color: color.gold }}>@{author?.username || "unknown"}</span>
            </div>

            {/* Comment content */}
            <div style={{ fontSize: 14, color: color.text, lineHeight: 1.5, background: color.surfaceRaised, borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
              {comment?.content || <span style={{ color: color.faint, fontStyle: "italic" }}>Comment not found</span>}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => handleRemoveComment(item)}
                style={{ flex: 1, background: color.danger, border: "none", borderRadius: 8, padding: "9px 0", color: "#fff", fontSize: type.xs, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
                Remove comment
              </button>
              <button onClick={() => handleDismiss(item)}
                style={{ flex: 1, background: "none", border: `1px solid ${color.line}`, borderRadius: 8, padding: "9px 0", color: color.muted, fontSize: type.xs, cursor: "pointer", fontFamily: SANS }}>
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
      <div style={{ background: color.surface, border: `1px solid ${color.line}`, borderRadius: 10, padding: 14, marginBottom: 20 }}>
        <div style={{ fontSize: type.xs, color: color.muted, letterSpacing: 1, marginBottom: 10 }}>MANAGE USER BADGES</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            value={userQuery}
            onChange={e => setUserQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && searchUsers()}
            placeholder="Search by username or display name..."
            style={{ flex: 1, background: color.surfaceRaised, border: `1px solid ${color.lineInput}`, borderRadius: 8, padding: "9px 12px", color: color.text, fontSize: type.md, fontFamily: SANS, outline: "none" }}
          />
          <button onClick={searchUsers}
            style={{ background: color.gold, border: "none", borderRadius: 8, padding: "9px 16px", color: color.bg, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
            Find
          </button>
        </div>

        {/* Search results dropdown */}
        {searching && <div style={{ fontSize: type.xs, color: color.faint, padding: "6px 0" }}>Searching...</div>}
        {userResults.map(u => (
          <div key={u.id} onClick={() => loadUserBadges(u)}
            style={{ padding: "8px 10px", background: color.surfaceRaised, borderRadius: 6, marginBottom: 4, cursor: "pointer", fontSize: 13, color: color.text }}>
            <span style={{ color: color.gold }}>@{u.username}</span>
            {u.display_name && u.display_name !== u.username && <span style={{ color: color.muted, marginLeft: 8 }}>{u.display_name}</span>}
          </div>
        ))}

        {/* Selected user */}
        {selectedUser && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: color.surfaceRaised, borderRadius: 6, border: `1px solid ${color.gold}44` }}>
            <span style={{ fontSize: 13, color: color.gold }}>@{selectedUser.username}</span>
            <span style={{ fontSize: type.xs, color: color.green }}>{userBadges.size} badges earned</span>
            <button onClick={() => { setSelectedUser(null); setUserBadges(new Set()); setUserQuery(""); }}
              style={{ background: "none", border: "none", color: color.faint, fontSize: 16, cursor: "pointer" }}>×</button>
          </div>
        )}
      </div>

      {/* Action message */}
      {actionMsg && (
        <div style={{ background: actionMsg.isError ? `${color.danger}22` : `${color.green}22`, border: `1px solid ${actionMsg.isError ? `${color.danger}55` : `${color.green}55`}`, borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: actionMsg.isError ? color.dangerText : color.green, textAlign: "center" }}>
          {actionMsg.msg}
        </div>
      )}

      {/* Badge list by category */}
      {loading
        ? <div style={{ textAlign: "center", padding: "30px 0", fontSize: 13, color: color.faint }}>Loading badges...</div>
        : CATEGORY_ORDER.map(cat => {
          const catBadges = grouped[cat];
          if (!catBadges) return null;
          return (
            <div key={cat} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: type.xs, color: color.muted, letterSpacing: 1, marginBottom: 10 }}>{CATEGORY_LABELS[cat].toUpperCase()}</div>
              {catBadges.map(b => {
                const earned = userBadges.has(b.key);
                const count = earnedCounts[b.key] || 0;
                return (
                  <div key={b.key} style={{ background: color.surface, border: `1px solid ${earned ? `${color.gold}44` : color.line}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: earned ? color.text : color.muted }}>{b.name}</div>
                      <div style={{ fontSize: type.xs, color: color.faint, marginTop: 2 }}>{b.description}</div>
                      <div style={{ fontSize: type.xs, color: "#4a3525", marginTop: 3 }}>{count} user{count !== 1 ? "s" : ""} earned</div>
                    </div>
                    {selectedUser && (
                      <button
                        onClick={() => earned ? handleRevoke(b.key) : handleAward(b.key)}
                        style={{ background: earned ? "none" : color.gold, border: earned ? `1px solid ${color.danger}55` : "none", borderRadius: 8, padding: "6px 12px", color: earned ? color.danger : color.bg, fontSize: type.xs, fontWeight: 700, cursor: "pointer", fontFamily: SANS, whiteSpace: "nowrap", flexShrink: 0 }}>
                        {earned ? "Revoke" : "Award"}
                      </button>
                    )}
                    {!selectedUser && earned !== undefined && (
                      <div style={{ fontSize: type.xs, color: "#4a3525", flexShrink: 0 }}>Search user to manage</div>
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
    manual: color.green,
    ai_generated: color.gold,
    user_submitted: color.partner,
    admin_approved: color.plum,
  };

  const filtered = cigars.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.brand?.toLowerCase().includes(q) || c.line?.toLowerCase().includes(q) || c.vitola?.toLowerCase().includes(q);
  });

  return (
    <div>
      <div style={{ fontSize: type.xs, color: color.cream, fontWeight: 600, marginBottom: 16 }}>Cigar Database</div>

      {msg && <div style={{ background: `${color.green}22`, border: `1px solid ${color.green}55`, borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: color.green }}>{msg}</div>}

      {/* Source filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {["all", "manual", "ai_generated", "user_submitted", "admin_approved"].map(s => (
          <button key={s} onClick={() => setSourceFilter(s)}
            style={{ background: sourceFilter === s ? `${color.gold}22` : "none", border: `1px solid ${sourceFilter === s ? color.gold : color.line}`, borderRadius: 20, padding: "4px 12px", color: sourceFilter === s ? color.gold : color.muted, fontSize: type.xs, cursor: "pointer", fontFamily: SANS }}>
            {s === "all" ? "All" : s.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        placeholder="Search brand, line, vitola..."
        style={{ width: "100%", background: color.surfaceRaised, border: `1px solid ${color.lineInput}`, borderRadius: 8, padding: "8px 12px", color: color.text, fontSize: type.md, fontFamily: SANS, outline: "none", boxSizing: "border-box", marginBottom: 12 }}
      />

      <div style={{ fontSize: type.xs, color: color.faint, marginBottom: 10 }}>{loading ? "Loading..." : `${filtered.length} cigars`}</div>

      {filtered.map(c => (
        <div key={c.id} style={{ background: color.surface, border: `1px solid ${confirmDeleteId === c.id ? color.danger : color.line}`, borderRadius: 8, padding: "10px 14px", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: type.xs, color: color.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {c.brand} · {c.line} · {c.vitola}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center" }}>
                <span style={{ fontSize: type.xs, color: SOURCE_COLORS[c.source] || color.muted, background: (SOURCE_COLORS[c.source] || color.muted) + "22", border: `1px solid ${(SOURCE_COLORS[c.source] || color.muted)}55`, borderRadius: 8, padding: "1px 6px" }}>
                  {c.source || "manual"}
                </span>
                {c.strength && <span style={{ fontSize: type.xs, color: color.faint }}>{c.strength}</span>}
              </div>
            </div>
            {confirmDeleteId === c.id ? (
              <button onClick={() => { setConfirmDeleteId(null); setDeleteConfirmText(""); }}
                style={{ background: "none", border: `1px solid ${color.line}`, borderRadius: 6, padding: "4px 10px", color: color.faint, fontSize: type.xs, cursor: "pointer", fontFamily: SANS, flexShrink: 0 }}>
                Cancel
              </button>
            ) : (
              <button onClick={() => { setConfirmDeleteId(c.id); setDeleteConfirmText(""); }}
                style={{ background: "none", border: `1px solid ${color.danger}44`, borderRadius: 6, padding: "4px 10px", color: color.danger, fontSize: type.xs, cursor: "pointer", fontFamily: SANS, flexShrink: 0 }}>
                Delete
              </button>
            )}
          </div>

          {/* Type DELETE confirmation */}
          {confirmDeleteId === c.id && (
            <div style={{ marginTop: 10, borderTop: `1px solid ${color.line}`, paddingTop: 10 }}>
              <div style={{ fontSize: type.xs, color: color.danger, marginBottom: 6 }}>
                Type <strong>DELETE</strong> to confirm deletion of {c.brand} {c.line} {c.vitola}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  style={{ flex: 1, background: color.bg, border: `1px solid ${deleteConfirmText === "DELETE" ? color.danger : color.line}`, borderRadius: 6, padding: "6px 10px", color: color.text, fontSize: type.md, fontFamily: SANS, outline: "none" }}
                />
                <button
                  onClick={() => { if (deleteConfirmText === "DELETE") { handleDelete(c); setConfirmDeleteId(null); setDeleteConfirmText(""); } }}
                  disabled={deleteConfirmText !== "DELETE" || deleting === c.id}
                  style={{ background: deleteConfirmText === "DELETE" ? color.danger : color.surfaceRaised, border: "none", borderRadius: 6, padding: "6px 14px", color: deleteConfirmText === "DELETE" ? color.text : color.faint, fontSize: type.xs, fontWeight: 700, cursor: deleteConfirmText === "DELETE" ? "pointer" : "default", fontFamily: SANS, flexShrink: 0 }}>
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

// Module scope, not nested inside the form component. Declaring these inside
// gave them a new identity on every render, so React unmounted and remounted
// the <input> on each keystroke and focus was lost after one character.
function SelectField({ label, field, options, form, setForm }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: type.xs, color: color.tan, letterSpacing: 1, marginBottom: 3 }}>{label}</div>
      <select value={form[field] || ""} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
        style={{ width: "100%", background: color.bg, border: `1px solid ${color.faintAlt}`, borderRadius: 6, padding: "7px 10px", color: form[field] ? color.heading : color.dim, fontSize: type.md, fontFamily: SANS, outline: "none", boxSizing: "border-box" }}>
        <option value="">Select {label.toLowerCase()}...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function TextField({ label, field, placeholder, form, setForm }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: type.xs, color: color.tan, letterSpacing: 1, marginBottom: 3 }}>{label}</div>
      <input value={form[field] || ""} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
        placeholder={placeholder}
        style={{ width: "100%", background: color.bg, border: `1px solid ${color.faintAlt}`, borderRadius: 6, padding: "7px 10px", color: color.heading, fontSize: type.md, fontFamily: SANS, outline: "none", boxSizing: "border-box" }} />
    </div>
  );
}
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

  return (
    <div style={{ borderTop: `1px solid ${color.lineStrong}`, paddingTop: 12, marginBottom: 10 }}>
      <div style={{ fontSize: type.xs, color: color.goldLegacy, letterSpacing: 1, marginBottom: 10 }}>ADD TO DATABASE</div>
      <TextField label="BRAND" field="brand" placeholder="Brand name" form={form} setForm={setForm} />
      <TextField label="LINE" field="line" placeholder="Line name" form={form} setForm={setForm} />
      <TextField label="VITOLA" field="vitola" placeholder="e.g. Robusto, Toro" form={form} setForm={setForm} />
      <SelectField label="STRENGTH" field="strength" options={["Mild", "Mild-Medium", "Medium", "Medium-Full", "Full"]} form={form} setForm={setForm} />
      <SelectField label="ORIGIN" field="origin" options={originOptions} form={form} setForm={setForm} />
      <SelectField label="WRAPPER" field="wrapper" options={wrapperOptions} form={form} setForm={setForm} />

      {/* Tasting notes bubbles */}
      <div style={{ fontSize: type.xs, color: color.tan, letterSpacing: 1, marginBottom: 6 }}>TASTING NOTES</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {TASTING_NOTE_OPTIONS.map(note => (
          <button key={note} onClick={() => toggleNote(note)}
            style={{ background: selectedNotes.includes(note) ? `${color.goldLegacy}22` : "none", border: `1px solid ${selectedNotes.includes(note) ? color.goldLegacy : color.lineStrong}`, borderRadius: 20, padding: "4px 10px", color: selectedNotes.includes(note) ? color.goldLegacy : color.dim, fontSize: type.xs, cursor: "pointer", fontFamily: SANS }}>
            {note}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleSave} disabled={saving || !form.brand || !form.line || !form.vitola}
          style={{ flex: 2, background: (!saving && form.brand && form.line && form.vitola) ? color.gold : color.surfaceRaised, border: "none", borderRadius: 8, padding: "9px 0", color: (!saving && form.brand && form.line && form.vitola) ? color.bg : color.dim, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
          {saving ? "Saving..." : "Save to DB"}
        </button>
        <button onClick={onCancel}
          style={{ flex: 1, background: "none", border: `1px solid ${color.lineStrong}`, borderRadius: 8, padding: "9px 0", color: color.dim, fontSize: type.xs, cursor: "pointer", fontFamily: SANS }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function MissingCigarsSection({ currentUserId }) {
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
    await logAction("approve_missing_cigar", "cigar", newCigar.id, currentUserId, `${formData.brand} ${formData.line} ${formData.vitola} added from missing cigars`);
    setItems(prev => prev.filter(i => i.id !== item.id));
    setAddingId(null);
    setMsg({ text: `${formData.brand} ${formData.line} ${formData.vitola} added — existing entries linked.`, isError: false });
    setTimeout(() => setMsg(null), 5000);
  };

  const handleDismiss = async (id) => {
    await supabase.from("missing_cigars").delete().eq("id", id);
    await logAction("dismiss_missing_cigar", "missing_cigar", id, currentUserId, null);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <div style={{ fontSize: type.xs, color: color.cream, fontWeight: 600 }}>Missing Cigars</div>
        <button onClick={() => setShowResolved(v => !v)}
          style={{ background: "none", border: `1px solid ${color.line}`, borderRadius: 20, padding: "4px 12px", color: color.muted, fontSize: type.xs, cursor: "pointer", fontFamily: SANS }}>
          {showResolved ? "Show Pending" : "Show Resolved"}
        </button>
      </div>

      <div style={{ fontSize: type.xs, color: color.faint, marginBottom: 12 }}>
        {showResolved ? "Cigars already added to the DB." : "Cigars scanned by users that aren't in the DB yet."}
      </div>

      {msg && (
        <div style={{ background: msg.isError ? `${color.danger}22` : `${color.green}22`, border: `1px solid ${msg.isError ? `${color.danger}55` : `${color.green}55`}`, borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: msg.isError ? color.dangerText : color.green }}>
          {msg.text}
        </div>
      )}

      {loading && <div style={{ fontSize: 13, color: color.faint, textAlign: "center", padding: "20px 0" }}>Loading...</div>}

      {!loading && items.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div style={{ marginBottom: 10, display: "flex", justifyContent: "center" }}><Icon.Check size={28} color={color.borderStrong} /></div>
          <div style={{ fontSize: 13, color: color.faint }}>{showResolved ? "No resolved items." : "No missing cigars reported."}</div>
        </div>
      )}

      {items.map(item => (
        <div key={item.id} style={{ background: color.surface, border: `1px solid ${addingId === item.id ? `${color.gold}55` : `${color.gold}22`}`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: color.text, marginBottom: 4 }}>
            {item.brand} · {item.line}
          </div>
          {item.vitola && <div style={{ fontSize: type.xs, color: color.muted, marginBottom: 4 }}>Vitola: {item.vitola}</div>}
          <div style={{ fontSize: type.xs, color: color.faint, marginBottom: 10 }}>
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
                style={{ flex: 2, background: `${color.gold}14`, border: `1px solid ${color.goldLegacy}55`, borderRadius: 8, padding: "7px 0", color: color.goldLegacy, fontSize: type.xs, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
                + Add to DB
              </button>
              {dismissConfirmId === item.id ? (
                <>
                  <button onClick={() => handleDismiss(item.id)}
                    style={{ flex: 1, background: `${color.danger}22`, border: `1px solid ${color.danger}`, borderRadius: 8, padding: "7px 0", color: color.dangerText, fontSize: type.xs, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
                    Yes
                  </button>
                  <button onClick={() => setDismissConfirmId(null)}
                    style={{ flex: 1, background: "none", border: `1px solid ${color.lineStrong}`, borderRadius: 8, padding: "7px 0", color: color.dim, fontSize: type.xs, cursor: "pointer", fontFamily: SANS }}>
                    Cancel
                  </button>
                </>
              ) : (
                <button onClick={() => setDismissConfirmId(item.id)}
                  style={{ flex: 1, background: "none", border: `1px solid ${color.lineStrong}`, borderRadius: 8, padding: "7px 0", color: color.dim, fontSize: type.xs, cursor: "pointer", fontFamily: SANS }}>
                  Dismiss
                </button>
              )}
            </div>
          )}
          {dismissConfirmId === item.id && (
            <div style={{ fontSize: type.xs, color: color.dangerText, marginTop: 6, textAlign: "center" }}>
              Are you sure you want to dismiss this cigar addition?
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function FeedbackSection({ currentUser }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showResolved, setShowResolved] = useState(false);
  const [replyingId, setReplyingId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadFeedback(); }, [filter, showResolved]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadFeedback = async () => {
    setLoading(true);
    let query = supabase
      .from("feedback")
      .select("*")
      .eq("resolved", showResolved)
      .order("created_at", { ascending: false });
    if (filter !== "all") query = query.eq("type", filter);
    const { data } = await query;
    setItems(data || []);
    setLoading(false);
  };

  const handleResolve = async (id) => {
    await supabase.from("feedback").update({ resolved: true }).eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleReply = async (item) => {
    if (!replyText.trim()) return;
    setSaving(true);
    await supabase.from("feedback").update({
      reply_text: replyText.trim(),
      replied_at: new Date().toISOString(),
      resolved: true,
    }).eq("id", item.id);

    // Get admin display name from public users table
    let adminName = "Ashed";
    if (currentUser?.id) {
      const { data: adminUser } = await supabase.from("users").select("display_name, username").eq("id", currentUser.id).maybeSingle();
      adminName = adminUser?.display_name || adminUser?.username || currentUser?.user_metadata?.display_name || "Ashed";
    }

    // Notify the user if we have their user_id
    if (item.user_id) {
      await supabase.from("notifications").insert({
        user_id: item.user_id,
        type: "feedback_reply",
        message: `${adminName} at Ashed replied to your ${item.type === "bug" ? "bug report" : "feedback"}: "${replyText.trim().substring(0, 100)}${replyText.length > 100 ? "..." : ""}"`,
        is_read: false,
      });
    }

    await logAction("reply_feedback", "feedback", item.id, null, `Reply: ${replyText.trim().substring(0, 80)}`);
    setItems(prev => prev.filter(i => i.id !== item.id));
    setReplyingId(null);
    setReplyText("");
    setSaving(false);
  };

  const getPostHogUrl = (sessionId) =>
    `https://us.posthog.com/replay?sessionId=${sessionId}`;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <div style={{ fontSize: type.xs, color: color.cream, fontWeight: 600 }}>Bug Reports & Feedback</div>
        <button onClick={() => setShowResolved(v => !v)}
          style={{ background: "none", border: `1px solid ${color.line}`, borderRadius: 20, padding: "4px 12px", color: color.muted, fontSize: type.xs, cursor: "pointer", fontFamily: SANS }}>
          {showResolved ? "Show Pending" : "Show Resolved"}
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {[["all", "All"], ["bug", "Bugs"], ["feedback", "Feedback"]].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            style={{ background: filter === val ? `${color.goldLegacy}22` : "none", border: `1px solid ${filter === val ? `${color.goldLegacy}55` : color.line}`, borderRadius: 20, padding: "4px 12px", color: filter === val ? color.goldLegacy : color.dim, fontSize: type.xs, cursor: "pointer", fontFamily: SANS }}>
            {label}
          </button>
        ))}
      </div>

      {loading && <div style={{ fontSize: 13, color: color.faint, textAlign: "center", padding: "20px 0" }}>Loading...</div>}

      {!loading && items.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div style={{ marginBottom: 10, display: "flex", justifyContent: "center" }}><Icon.Check size={28} color={color.borderStrong} /></div>
          <div style={{ fontSize: 13, color: color.faint }}>{showResolved ? "No resolved items." : "Nothing pending."}</div>
        </div>
      )}

      {items.map(item => (
        <div key={item.id} style={{ background: color.surface, border: `1px solid ${color.lineStrong}`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: type.xs, background: item.type === "bug" ? `${color.danger}22` : `${color.green}22`, border: `1px solid ${item.type === "bug" ? `${color.danger}55` : `${color.green}55`}`, borderRadius: 6, padding: "2px 8px", color: item.type === "bug" ? color.dangerText : color.green }}>
              {item.type === "bug" ? "Bug" : "Feedback"}
            </span>
            <span style={{ fontSize: type.xs, color: color.faint, marginLeft: "auto" }}>
              {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
          <div style={{ fontSize: 13, color: color.soft, lineHeight: 1.6, marginBottom: 10 }}>{item.description}</div>

          {/* Existing reply */}
          {item.reply_text && (
            <div style={{ background: color.surfaceRaised, border: `1px solid ${color.green}33`, borderRadius: 8, padding: "10px 12px", marginBottom: 10 }}>
              <div style={{ fontSize: type.xs, color: color.green, letterSpacing: 1, marginBottom: 4 }}>YOUR REPLY</div>
              <div style={{ fontSize: type.xs, color: color.soft, lineHeight: 1.5 }}>{item.reply_text}</div>
            </div>
          )}

          {/* Reply form */}
          {replyingId === item.id && (
            <div style={{ marginBottom: 10 }}>
              <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
                placeholder="Write a reply to the user..."
                rows={3}
                style={{ width: "100%", background: color.bg, border: `1px solid ${color.goldLegacy}55`, borderRadius: 8, padding: "8px 10px", color: color.heading, fontSize: type.md, fontFamily: SANS, outline: "none", resize: "none", boxSizing: "border-box", marginBottom: 8 }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => handleReply(item)} disabled={saving || !replyText.trim()}
                  style={{ flex: 2, background: replyText.trim() ? color.gold : color.surfaceRaised, border: "none", borderRadius: 8, padding: "8px 0", color: replyText.trim() ? color.bg : color.faint, fontSize: type.xs, fontWeight: 700, cursor: replyText.trim() ? "pointer" : "default", fontFamily: SANS }}>
                  {saving ? "Sending..." : "Send Reply"}
                </button>
                <button onClick={() => { setReplyingId(null); setReplyText(""); }}
                  style={{ flex: 1, background: "none", border: `1px solid ${color.lineStrong}`, borderRadius: 8, padding: "8px 0", color: color.dim, fontSize: type.xs, cursor: "pointer", fontFamily: SANS }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            {item.posthog_session_id && (
              <a href={getPostHogUrl(item.posthog_session_id)} target="_blank" rel="noreferrer"
                style={{ flex: 1, background: color.surfaceRaised, border: `1px solid ${color.lineStrong}`, borderRadius: 8, padding: "7px 0", color: color.tan, fontSize: type.xs, cursor: "pointer", fontFamily: SANS, textAlign: "center", textDecoration: "none" }}>
                Watch session
              </a>
            )}
            {!showResolved && replyingId !== item.id && (
              <>
                <button onClick={() => { setReplyingId(item.id); setReplyText(""); }}
                  style={{ flex: 1, background: "none", border: `1px solid ${color.goldLegacy}44`, borderRadius: 8, padding: "7px 0", color: color.goldLegacy, fontSize: type.xs, cursor: "pointer", fontFamily: SANS }}>
                  Reply
                </button>
                <button onClick={() => handleResolve(item.id)}
                  style={{ flex: 1, background: color.positive, border: "none", borderRadius: 8, padding: "7px 0", color: color.text, fontSize: type.xs, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
                  Resolve
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function DbRefreshSection() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");

  useEffect(() => { loadCandidates(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCandidates = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("db_refresh_candidates")
      .select("*")
      .eq("status", filter)
      .order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  const handleApprove = async (item) => {
    // Insert into cigars table
    const vitolas = item.vitolas ? item.vitolas.split(",").map(v => v.trim()) : ["Robusto"];
    for (const vitola of vitolas) {
      const { data: existing } = await supabase
        .from("cigars")
        .select("id")
        .eq("brand", item.brand)
        .eq("line", item.line)
        .eq("vitola", vitola)
        .maybeSingle();
      if (!existing) {
        await supabase.from("cigars").insert({
          brand: item.brand,
          line: item.line,
          vitola,
          source: "admin_approved",
        });
      }
    }
    await supabase.from("db_refresh_candidates").update({ status: "approved" }).eq("id", item.id);
    setItems(prev => prev.filter(i => i.id !== item.id));
  };

  const handleDismiss = async (id) => {
    await supabase.from("db_refresh_candidates").update({ status: "dismissed" }).eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
  };


  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <div style={{ fontSize: type.xs, color: color.cream, fontWeight: 600 }}>DB Refresh Candidates</div>
        <div style={{ fontSize: type.xs, color: color.faint }}>Runs 1st of each month</div>
      </div>

      <div style={{ fontSize: type.xs, color: color.faint, marginBottom: 12 }}>
        Searches Halfwheel for new releases from brands in our DB. Runs automatically via Vercel Cron. Manual triggering now requires the CRON_SECRET, which is deliberately not available in the browser — run it from a terminal: <span style={{ color: color.tan, fontFamily: "monospace" }}>curl -H "Authorization: Bearer $CRON_SECRET" https://ashed.app/api/db-refresh</span>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {[["pending", "Pending"], ["approved", "Approved"], ["dismissed", "Dismissed"]].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            style={{ background: filter === val ? `${color.goldLegacy}22` : "none", border: `1px solid ${filter === val ? `${color.goldLegacy}55` : color.line}`, borderRadius: 20, padding: "4px 12px", color: filter === val ? color.goldLegacy : color.dim, fontSize: type.xs, cursor: "pointer", fontFamily: SANS }}>
            {label}
          </button>
        ))}
      </div>

      {loading && <div style={{ fontSize: 13, color: color.faint, textAlign: "center", padding: "20px 0" }}>Loading...</div>}

      {!loading && items.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div style={{ marginBottom: 10, display: "flex", justifyContent: "center" }}><Icon.Check size={28} color={color.borderStrong} /></div>
          <div style={{ fontSize: 13, color: color.faint }}>No {filter} candidates.</div>
        </div>
      )}

      {items.map(item => (
        <div key={item.id} style={{ background: color.surface, border: `1px solid ${color.lineStrong}`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: color.heading, marginBottom: 4 }}>
            {item.brand} · {item.line}
          </div>
          {item.vitolas && <div style={{ fontSize: type.xs, color: color.tan, marginBottom: 4 }}>Vitolas: {item.vitolas}</div>}
          {item.notes && <div style={{ fontSize: type.xs, color: color.dim, lineHeight: 1.5, marginBottom: 6 }}>{item.notes}</div>}
          {item.source_url && (
            <a href={item.source_url} target="_blank" rel="noreferrer"
              style={{ fontSize: type.xs, color: color.goldLegacy, textDecoration: "none", display: "block", marginBottom: 10 }}>
              View on Halfwheel
            </a>
          )}
          <div style={{ fontSize: type.xs, color: color.faint, marginBottom: item.status === "pending" ? 10 : 0 }}>
            Found: {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </div>
          {filter === "pending" && (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => handleApprove(item)}
                style={{ flex: 2, background: color.positive, border: "none", borderRadius: 8, padding: "7px 0", color: color.text, fontSize: type.xs, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
                Add to DB
              </button>
              <button onClick={() => handleDismiss(item.id)}
                style={{ flex: 1, background: "none", border: `1px solid ${color.line}`, borderRadius: 8, padding: "7px 0", color: color.faint, fontSize: type.xs, cursor: "pointer", fontFamily: SANS }}>
                Dismiss
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function QASection({ currentUserId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [msg, setMsg] = useState(null);

  const STRENGTHS = ["Mild", "Mild-Medium", "Medium", "Medium-Full", "Full"];

  useEffect(() => { loadItems(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadItems = async () => {
    setLoading(true);
    let query = supabase
      .from("cigars")
      .select("*, users!cigars_submitted_by_fkey(username)")
      .eq("source", filter === "pending" ? "user_submitted" : filter === "approved" ? "admin_approved" : "rejected")
      .order("created_at", { ascending: false });
    if (filter === "pending") query = query.eq("verified", false);
    const { data } = await query;
    setItems(data || []);
    setLoading(false);
  };

  const showMsg = (text, isError = false) => {
    setMsg({ text, isError });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleApprove = async (item) => {
    const update = editingId === item.id ? {
      brand: editForm.brand || item.brand,
      line: editForm.line || item.line,
      vitola: editForm.vitola || item.vitola,
      strength: editForm.strength || item.strength,
      origin: editForm.origin || item.origin,
      wrapper: editForm.wrapper || item.wrapper,
      source: "admin_approved",
      verified: true,
      rejection_reason: null,
    } : {
      source: "admin_approved",
      verified: true,
      rejection_reason: null,
    };
    const { error } = await supabase.from("cigars").update(update).eq("id", item.id);
    if (error) { showMsg("Error approving cigar.", true); return; }
    await logAction("approve_cigar", "cigar", item.id, currentUserId, `${item.brand} ${item.line} ${item.vitola}`);
    setItems(prev => prev.filter(i => i.id !== item.id));
    setEditingId(null);
    showMsg(`${item.brand} ${item.line} approved`);
  };

  const handleReject = async (item) => {
    if (!rejectReason.trim()) return;
    const { error } = await supabase.from("cigars").update({
      source: "rejected",
      verified: false,
      rejection_reason: rejectReason.trim(),
    }).eq("id", item.id);
    if (error) { showMsg("Error rejecting cigar.", true); return; }
    await logAction("reject_cigar", "cigar", item.id, currentUserId, `${item.brand} ${item.line} ${item.vitola} — reason: ${rejectReason.trim()}`);
    setItems(prev => prev.filter(i => i.id !== item.id));
    setRejectingId(null);
    setRejectReason("");
    showMsg("Cigar rejected.");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <div style={{ fontSize: type.xs, color: color.cream, fontWeight: 600 }}>User-Submitted Cigars</div>
      </div>

      {msg && (
        <div style={{ background: msg.isError ? `${color.danger}22` : `${color.green}22`, border: `1px solid ${msg.isError ? `${color.danger}55` : `${color.green}55`}`, borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: type.xs, color: msg.isError ? color.dangerText : color.green }}>
          {msg.text}
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {[["pending", "Pending"], ["approved", "Approved"], ["rejected", "Rejected"]].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            style={{ background: filter === val ? `${color.goldLegacy}22` : "none", border: `1px solid ${filter === val ? `${color.goldLegacy}55` : color.line}`, borderRadius: 20, padding: "4px 12px", color: filter === val ? color.goldLegacy : color.dim, fontSize: type.xs, cursor: "pointer", fontFamily: SANS }}>
            {label}
          </button>
        ))}
      </div>

      {loading && <div style={{ fontSize: 13, color: color.faint, textAlign: "center", padding: "20px 0" }}>Loading...</div>}
      {!loading && items.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div style={{ marginBottom: 10, display: "flex", justifyContent: "center" }}><Icon.Check size={28} color={color.borderStrong} /></div>
          <div style={{ fontSize: 13, color: color.faint }}>No {filter} submissions.</div>
        </div>
      )}

      {items.map(item => (
        <div key={item.id} style={{ background: color.surface, border: `1px solid ${editingId === item.id ? `${color.goldLegacy}55` : color.lineStrong}`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: color.heading, marginBottom: 2 }}>
            {item.brand} · {item.line}
          </div>
          <div style={{ fontSize: type.xs, color: color.tan, marginBottom: 4 }}>
            {item.vitola}{item.strength ? ` · ${item.strength}` : ""}
          </div>
          <div style={{ fontSize: type.xs, color: color.faint, marginBottom: item.rejection_reason ? 6 : 10 }}>
            Submitted by @{item.users?.username || "unknown"}
          </div>
          {item.rejection_reason && (
            <div style={{ fontSize: type.xs, color: color.dangerText, marginBottom: 10, background: `${color.danger}11`, borderRadius: 6, padding: "6px 8px" }}>
              Rejected: {item.rejection_reason}
            </div>
          )}

          {/* Edit form */}
          {editingId === item.id && (
            <div style={{ borderTop: `1px solid ${color.lineStrong}`, paddingTop: 12, marginBottom: 10 }}>
              <div style={{ fontSize: type.xs, color: color.goldLegacy, letterSpacing: 1, marginBottom: 8 }}>EDIT DETAILS</div>
              {[["BRAND", "brand", item.brand], ["LINE", "line", item.line], ["VITOLA", "vitola", item.vitola], ["ORIGIN", "origin", item.origin || ""], ["WRAPPER", "wrapper", item.wrapper || ""]].map(([label, field, def]) => (
                <div key={field} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: type.xs, color: color.dim, letterSpacing: 1, marginBottom: 3 }}>{label}</div>
                  <input value={editForm[field] ?? def} onChange={e => setEditForm(p => ({ ...p, [field]: e.target.value }))}
                    style={{ width: "100%", background: color.bg, border: `1px solid ${color.lineStrong}`, borderRadius: 6, padding: "7px 10px", color: color.heading, fontSize: type.md, fontFamily: SANS, outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: type.xs, color: color.dim, letterSpacing: 1, marginBottom: 3 }}>STRENGTH</div>
                <select value={editForm.strength ?? item.strength ?? ""} onChange={e => setEditForm(p => ({ ...p, strength: e.target.value }))}
                  style={{ width: "100%", background: color.bg, border: `1px solid ${color.lineStrong}`, borderRadius: 6, padding: "7px 10px", color: color.heading, fontSize: type.md, fontFamily: SANS, outline: "none", boxSizing: "border-box" }}>
                  <option value="">Select...</option>
                  {STRENGTHS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Reject form */}
          {rejectingId === item.id && (
            <div style={{ borderTop: `1px solid ${color.lineStrong}`, paddingTop: 12, marginBottom: 10 }}>
              <div style={{ fontSize: type.xs, color: color.dangerText, letterSpacing: 1, marginBottom: 8 }}>REJECTION REASON (shown to user)</div>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                placeholder="e.g. This cigar could not be verified. Please check the brand and line name and try again."
                rows={3}
                style={{ width: "100%", background: color.bg, border: `1px solid ${color.danger}55`, borderRadius: 6, padding: "8px 10px", color: color.heading, fontSize: type.md, fontFamily: SANS, outline: "none", resize: "none", boxSizing: "border-box", marginBottom: 8 }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => handleReject(item)} disabled={!rejectReason.trim()}
                  style={{ flex: 1, background: rejectReason.trim() ? color.danger : color.line, border: "none", borderRadius: 8, padding: "8px 0", color: rejectReason.trim() ? color.heading : color.faint, fontSize: type.xs, fontWeight: 700, cursor: rejectReason.trim() ? "pointer" : "default", fontFamily: SANS }}>
                  Confirm Reject
                </button>
                <button onClick={() => { setRejectingId(null); setRejectReason(""); }}
                  style={{ flex: 1, background: "none", border: `1px solid ${color.lineStrong}`, borderRadius: 8, padding: "8px 0", color: color.dim, fontSize: type.xs, cursor: "pointer", fontFamily: SANS }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {filter === "pending" && editingId !== item.id && rejectingId !== item.id && (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => handleApprove(item)}
                style={{ flex: 2, background: color.positive, border: "none", borderRadius: 8, padding: "8px 0", color: color.heading, fontSize: type.xs, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
                Approve
              </button>
              <button onClick={() => { setEditingId(item.id); setEditForm({}); }}
                style={{ flex: 1, background: "none", border: `1px solid ${color.goldLegacy}44`, borderRadius: 8, padding: "8px 0", color: color.goldLegacy, fontSize: type.xs, cursor: "pointer", fontFamily: SANS }}>
                Edit
              </button>
              <button onClick={() => { setRejectingId(item.id); setRejectReason(""); }}
                style={{ flex: 1, background: "none", border: `1px solid ${color.danger}44`, borderRadius: 8, padding: "8px 0", color: color.danger, fontSize: type.xs, cursor: "pointer", fontFamily: SANS }}>
                Reject
              </button>
            </div>
          )}
          {filter === "pending" && editingId === item.id && (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => handleApprove(item)}
                style={{ flex: 2, background: color.gold, border: "none", borderRadius: 8, padding: "8px 0", color: color.bg, fontSize: type.xs, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
                Save & approve
              </button>
              <button onClick={() => setEditingId(null)}
                style={{ flex: 1, background: "none", border: `1px solid ${color.lineStrong}`, borderRadius: 8, padding: "8px 0", color: color.dim, fontSize: type.xs, cursor: "pointer", fontFamily: SANS }}>
                Cancel
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DedupSection({ currentUserId }) {
  const [groups, setGroups] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [skipped, setSkipped] = useState(new Set());
  const [merging, setMerging] = useState(null);
  const [merged, setMerged] = useState([]);
  const [msg, setMsg] = useState(null);
  const [hasScanned, setHasScanned] = useState(false);

  const handleScan = async () => {
    setScanning(true);
    setGroups([]);
    setSkipped(new Set());
    setMerged([]);
    setMsg(null);

    // Fetch all cigars
    // Fetch all cigars in batches to get past 1000 row limit
    let allCigars = [];
    let from = 0;
    const batchSize = 1000;
    while (true) {
      const { data: batch } = await supabase
        .from("cigars")
        .select("id, brand, line, vitola, source, verified, created_at, total_checkins")
        .order("created_at", { ascending: true })
        .range(from, from + batchSize - 1);
      if (!batch || batch.length === 0) break;
      allCigars = [...allCigars, ...batch];
      if (batch.length < batchSize) break;
      from += batchSize;
    }
    const cigars = allCigars;

    if (!cigars || allCigars.length === 0) { setScanning(false); return; }

    // Group by normalized brand+line+vitola
    const map = {};
    for (const c of cigars) {
      const key = `${c.brand?.trim().toLowerCase()}|||${c.line?.trim().toLowerCase()}|||${c.vitola?.trim().toLowerCase()}`;
      if (!map[key]) map[key] = [];
      map[key].push(c);
    }

    // Find groups with duplicates
    const dupGroups = Object.values(map)
      .filter(g => g.length > 1)
      .map(g => ({
        key: `${g[0].brand} · ${g[0].line} · ${g[0].vitola}`,
        keep: g[0], // oldest
        duplicates: g.slice(1),
      }));

    setGroups(dupGroups);
    setHasScanned(true);
    setScanning(false);
    setMsg(dupGroups.length === 0
      ? { text: "No duplicates found — DB is clean.", isError: false }
      : { text: `Found ${dupGroups.length} duplicate group${dupGroups.length > 1 ? "s" : ""}.`, isError: false }
    );
  };

  const handleMerge = async (group) => {
    setMerging(group.key);
    const keepId = group.keep.id;
    const dupIds = group.duplicates.map(d => d.id);

    try {
      // Update all references to point to keepId
      for (const dupId of dupIds) {
        await supabase.from("checkins").update({ cigar_id: keepId }).eq("cigar_id", dupId);
        await supabase.from("humidor").update({ cigar_id: keepId }).eq("cigar_id", dupId);
        await supabase.from("wishlist").update({ cigar_id: keepId }).eq("cigar_id", dupId);
        await supabase.from("pairings").delete().eq("cigar_id", dupId);
        await supabase.from("ratings").update({ cigar_id: keepId }).eq("cigar_id", dupId);
        await supabase.from("cigars").delete().eq("id", dupId);
      }
      await logAction("dedup_merge", "cigar", group.keep.id, currentUserId, `Merged ${group.duplicates.length} duplicate(s) of ${group.key} into ID ${group.keep.id}`);
      setMerged(prev => [...prev, group.key]);
      setGroups(prev => prev.filter(g => g.key !== group.key));
    } catch (e) {
      console.error("Merge error:", e);
    }
    setMerging(null);
  };

  const handleSkip = (key) => {
    setSkipped(prev => new Set([...prev, key]));
  };

  const pending = groups.filter(g => !skipped.has(g.key));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <div style={{ fontSize: type.xs, color: color.cream, fontWeight: 600 }}>Duplicate Finder</div>
        <button onClick={handleScan} disabled={scanning}
          style={{ background: scanning ? color.line : color.gold, border: "none", borderRadius: 20, padding: "5px 14px", color: scanning ? color.dim : color.bg, fontSize: type.xs, fontWeight: 700, cursor: scanning ? "default" : "pointer", fontFamily: SANS }}>
          {scanning ? "Scanning..." : "▶ Find Duplicates"}
        </button>
      </div>

      <div style={{ fontSize: type.xs, color: color.faint, marginBottom: 14, lineHeight: 1.6 }}>
        Finds cigars with the same brand, line, and vitola. Review each group before merging. The oldest record is kept and all check-ins, humidor, and wishlist entries are updated automatically.
      </div>

      {msg && (
        <div style={{ background: msg.isError ? `${color.danger}22` : `${color.green}22`, border: `1px solid ${msg.isError ? `${color.danger}55` : `${color.green}55`}`, borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: type.xs, color: msg.isError ? color.dangerText : color.green }}>
          {msg.text}
        </div>
      )}

      {merged.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: type.xs, color: color.dim, letterSpacing: 1, marginBottom: 8 }}>MERGED</div>
          {merged.map(key => (
            <div key={key} style={{ fontSize: type.xs, color: color.green, padding: "4px 0", borderBottom: `1px solid ${color.surfaceRaised}` }}>✓ {key}</div>
          ))}
        </div>
      )}

      {hasScanned && pending.length === 0 && groups.length === 0 && merged.length === 0 && (
        <div style={{ textAlign: "center", padding: "30px 0" }}>
          <div style={{ marginBottom: 8, display: "flex", justifyContent: "center" }}><Icon.Check size={28} color={color.borderStrong} /></div>
          <div style={{ fontSize: 13, color: color.faint }}>No duplicates found.</div>
        </div>
      )}

      {pending.map(group => (
        <div key={group.key} style={{ background: color.surface, border: `1px solid ${color.lineStrong}`, borderRadius: 10, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: type.xs, color: color.goldLegacy, fontWeight: 700, marginBottom: 10 }}>
            {group.key}
          </div>

          {/* Keep record */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: type.xs, color: color.green, letterSpacing: 1, marginBottom: 4 }}>KEEP (oldest)</div>
            <div style={{ background: color.bg, border: `1px solid ${color.green}33`, borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ fontSize: type.xs, color: color.soft }}>
                ID: <span style={{ color: color.dim }}>{String(group.keep.id).substring(0, 8)}</span>
                {" · "}Source: <span style={{ color: color.tan }}>{group.keep.source}</span>
                {" · "}Check-ins: <span style={{ color: color.tan }}>{group.keep.total_checkins || 0}</span>
                {" · "}{new Date(group.keep.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>
            </div>
          </div>

          {/* Duplicate records */}
          {group.duplicates.map(dup => (
            <div key={dup.id} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: type.xs, color: color.danger, letterSpacing: 1, marginBottom: 4 }}>DUPLICATE</div>
              <div style={{ background: color.bg, border: `1px solid ${color.danger}33`, borderRadius: 8, padding: "8px 10px" }}>
                <div style={{ fontSize: type.xs, color: color.soft }}>
                  ID: <span style={{ color: color.dim }}>{String(dup.id).substring(0, 8)}</span>
                  {" · "}Source: <span style={{ color: color.tan }}>{dup.source}</span>
                  {" · "}Check-ins: <span style={{ color: color.tan }}>{dup.total_checkins || 0}</span>
                  {" · "}{new Date(dup.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>
              </div>
            </div>
          ))}

          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={() => handleMerge(group)} disabled={merging === group.key}
              style={{ flex: 2, background: merging === group.key ? color.line : color.positive, border: "none", borderRadius: 8, padding: "8px 0", color: merging === group.key ? color.faint : color.heading, fontSize: type.xs, fontWeight: 700, cursor: merging === group.key ? "default" : "pointer", fontFamily: SANS }}>
              {merging === group.key ? "Merging..." : "⟶ Merge into Keep"}
            </button>
            <button onClick={() => handleSkip(group.key)}
              style={{ flex: 1, background: "none", border: `1px solid ${color.lineStrong}`, borderRadius: 8, padding: "8px 0", color: color.dim, fontSize: type.xs, cursor: "pointer", fontFamily: SANS }}>
              Skip
            </button>
          </div>
        </div>
      ))}

      {skipped.size > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: type.xs, color: color.faint }}>{skipped.size} group{skipped.size > 1 ? "s" : ""} skipped.</div>
        </div>
      )}
    </div>
  );
}

function AuditSection() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const ACTION_LABELS = {
    approve_cigar: { label: "Cigar Approved", color: color.green },
    reject_cigar: { label: "Cigar Rejected", color: color.danger },
    approve_missing_cigar: { label: "Missing → Added", color: color.green },
    dismiss_missing_cigar: { label: "Missing Dismissed", color: color.faint },
    dedup_merge: { label: "Duplicate Merged", color: color.partner },
    delete_user: { label: "User Deleted", color: color.danger },
    grant_admin: { label: "Admin Granted", color: color.goldLegacy },
    revoke_admin: { label: "Admin Revoked", color: color.dim },
    grant_mod: { label: "Mod Granted", color: color.partner },
    revoke_mod: { label: "Mod Revoked", color: color.faint },
  };

  const FILTERS = [
    ["all", "All"],
    ["cigar", "Cigars"],
    ["user", "Users"],
    ["dedup", "Dedup"],
  ];

  useEffect(() => { loadLogs(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadLogs = async () => {
    setLoading(true);
    let query = supabase
      .from("audit_log")
      .select("*, users(username)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (filter === "cigar") query = query.in("action", ["approve_cigar", "reject_cigar", "approve_missing_cigar", "dismiss_missing_cigar"]);
    else if (filter === "user") query = query.in("action", ["delete_user", "grant_admin", "revoke_admin", "grant_mod", "revoke_mod"]);
    else if (filter === "dedup") query = query.eq("action", "dedup_merge");

    const { data } = await query;
    setLogs(data || []);
    setLoading(false);
  };

  return (
    <div>
      <div style={{ fontSize: type.xs, color: color.cream, fontWeight: 600, marginBottom: 12 }}>Audit Log</div>

      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {FILTERS.map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            style={{ background: filter === val ? `${color.goldLegacy}22` : "none", border: `1px solid ${filter === val ? `${color.goldLegacy}55` : color.line}`, borderRadius: 20, padding: "4px 12px", color: filter === val ? color.goldLegacy : color.dim, fontSize: type.xs, cursor: "pointer", fontFamily: SANS }}>
            {label}
          </button>
        ))}
      </div>

      {loading && <div style={{ fontSize: 13, color: color.faint, textAlign: "center", padding: "20px 0" }}>Loading...</div>}

      {!loading && logs.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div style={{ marginBottom: 10, display: "flex", justifyContent: "center" }}><Icon.Feed size={28} color={color.borderStrong} /></div>
          <div style={{ fontSize: 13, color: color.faint }}>No audit entries yet.</div>
        </div>
      )}

      {logs.map(log => {
        const meta = ACTION_LABELS[log.action] || { label: log.action, color: color.dim };
        return (
          <div key={log.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderBottom: `1px solid ${color.surfaceRaised}` }}>
            
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>{meta.label}</span>
                <span style={{ fontSize: type.xs, color: color.faint }}>
                  {new Date(log.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} {new Date(log.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
              {log.notes && <div style={{ fontSize: type.xs, color: color.tan, marginTop: 2, lineHeight: 1.5 }}>{log.notes}</div>}
              <div style={{ fontSize: type.xs, color: color.faint, marginTop: 2 }}>
                by @{log.users?.username || "unknown"}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}