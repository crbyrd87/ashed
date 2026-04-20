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
        {section === "users"      && <ComingSoon label="User Management" />}
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
      .select("created_at")
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: true });
    setSignupsByDay(groupByDay(recentUsers || [], "created_at"));

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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 28 }}>
        {[
          ["Users",       totals.users,    "#c9a84c"],
          ["Check-ins",   totals.checkins, "#7a9a7a"],
          ["Cigars in DB",totals.cigars,   "#7a8a9a"],
          ["Fires",       totals.fires,    "#e8632a"],
          ["Comments",    totals.comments, "#9a7a9a"],
        ].map(([label, value, color]) => (
          <div key={label} style={{ background: "#2a1a0e", border: "1px solid #3a2510", borderRadius: 10, padding: "14px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 700, color }}>{value.toLocaleString()}</div>
            <div style={{ fontSize: 10, color: "#8a7055", letterSpacing: 1, marginTop: 4 }}>{label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#2a1a0e", border: "1px solid #3a2510", borderRadius: 10, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 14 }}>NEW SIGNUPS — LAST 30 DAYS</div>
        {signupsByDay.length === 0
          ? <div style={{ fontSize: 13, color: "#5a4535", textAlign: "center", padding: "20px 0" }}>No signups in this period</div>
          : <MiniBarChart data={signupsByDay} max={maxSignups} color="#c9a84c" />}
      </div>

      <div style={{ background: "#2a1a0e", border: "1px solid #3a2510", borderRadius: 10, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 14 }}>CHECK-INS PER DAY — LAST 30 DAYS</div>
        {checkinsByDay.length === 0
          ? <div style={{ fontSize: 13, color: "#5a4535", textAlign: "center", padding: "20px 0" }}>No check-ins in this period</div>
          : <MiniBarChart data={checkinsByDay} max={maxCheckins} color="#7a9a7a" />}
      </div>

      <div style={{ background: "#2a1a0e", border: "1px solid #3a2510", borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 14 }}>TOP 10 CIGARS BY CHECK-INS</div>
        {topCigars.length === 0
          ? <div style={{ fontSize: 13, color: "#5a4535", textAlign: "center", padding: "20px 0" }}>No data yet</div>
          : topCigars.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: "#5a4535", width: 18, textAlign: "right", flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "#e8d5b7", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.label}</div>
                <div style={{ height: 5, background: "#3a2510", borderRadius: 3, overflow: "hidden", marginTop: 4 }}>
                  <div style={{ width: `${Math.round((c.count / maxTopCount) * 100)}%`, height: "100%", background: "linear-gradient(90deg, #c9a84c, #e8cc7a)", borderRadius: 3 }} />
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#c9a84c", flexShrink: 0 }}>{c.count}</div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

function MiniBarChart({ data, max, color }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 80 }}>
      {data.map((d, i) => {
        const pct = Math.round((d.count / max) * 100);
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
            <div title={`${d.label}: ${d.count}`}
              style={{ width: "100%", background: color, borderRadius: "2px 2px 0 0", height: `${Math.max(pct, 2)}%`, opacity: 0.85 }} />
          </div>
        );
      })}
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

const ComingSoon = ({ label }) => (
  <div style={{ textAlign: "center", padding: "60px 20px" }}>
    <div style={{ fontSize: 36, marginBottom: 16 }}>🚧</div>
    <div style={{ fontSize: 15, fontWeight: 700, color: "#e8d5b7", marginBottom: 8 }}>{label}</div>
    <div style={{ fontSize: 13, color: "#5a4535" }}>Coming in the next build step.</div>
  </div>
);