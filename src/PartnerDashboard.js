import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const SECTIONS = [
  { id: "analytics", icon: "📊", label: "Analytics" },
  { id: "listing",   icon: "📋", label: "Listing" },
  { id: "announce",  icon: "📣", label: "Announce" },
];

export default function PartnerDashboard({ user, placeId, onClose }) {
  const [section, setSection] = useState("analytics");
  const [venue, setVenue] = useState(null);

  useEffect(() => {
    if (!placeId) return;
    const loadVenue = async () => {
      const { data } = await supabase
        .from("places")
        .select("*")
        .eq("place_id", placeId)
        .maybeSingle();
      setVenue(data || null);
    };
    loadVenue();
  }, [placeId]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#1a0f08", zIndex: 500, overflowY: "auto", fontFamily: SANS, color: "#e8d5b7", maxWidth: 900, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(180deg, #2d1810 0%, #1a0f08 100%)", padding: "16px 20px", borderBottom: "1px solid #3a2510", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 10 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#7a8a9a", letterSpacing: 2 }}>🏪 PARTNER DASHBOARD</div>
          <div style={{ fontSize: 11, color: "#8a7055", marginTop: 2, letterSpacing: 1 }}>
            {venue ? venue.name : placeId ? "Loading venue..." : "No venue linked"}
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#8a7055", fontSize: 26, cursor: "pointer", lineHeight: 1 }}>×</button>
      </div>

      {/* Section nav */}
      <div style={{ display: "flex", borderBottom: "1px solid #3a2510", background: "#1a0f08", position: "sticky", top: 57, zIndex: 9 }}>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            style={{ flex: 1, padding: "12px 0", background: "none", border: "none", borderBottom: `2px solid ${section === s.id ? "#7a8a9a" : "transparent"}`, color: section === s.id ? "#7a8a9a" : "#5a4535", fontSize: 11, cursor: "pointer", fontFamily: SANS, letterSpacing: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 16 }}>{s.icon}</span>
            <span>{s.label.toUpperCase()}</span>
          </button>
        ))}
      </div>

      <div style={{ padding: 20 }}>
        {section === "analytics" && <AnalyticsSection placeId={placeId} venue={venue} />}
        {section === "listing"   && <ListingSection placeId={placeId} venue={venue} onVenueUpdate={setVenue} />}
        {section === "announce"  && <AnnounceSection placeId={placeId} user={user} />}
      </div>
    </div>
  );
}

// ─── ANALYTICS ───────────────────────────────────────────────────────────────

function AnalyticsSection({ placeId, venue }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!placeId) return;
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeId]);

  const loadAnalytics = async () => {
    setLoading(true);

    // Get all check-ins at this venue (matched by smoke_location containing venue name)
    const venueName = venue?.name || "";
    const { data: checkins } = await supabase
      .from("checkins")
      .select("id, user_id, created_at, cigar_id, cigar_name, cigar_brand, rating, cigars(brand, line)")
      .ilike("smoke_location", `%${venueName || placeId}%`)
      .order("created_at", { ascending: false });

    if (!checkins || checkins.length === 0) {
      setStats({ total: 0, unique: 0, topCigars: [], byDay: [], avgRating: null, repeatVisitors: 0 });
      setLoading(false);
      return;
    }

    const total = checkins.length;
    const uniqueUsers = new Set(checkins.map(c => c.user_id));
    const unique = uniqueUsers.size;

    // Repeat visitors (visited 2+ times)
    const visitCounts = {};
    for (const c of checkins) visitCounts[c.user_id] = (visitCounts[c.user_id] || 0) + 1;
    const repeatVisitors = Object.values(visitCounts).filter(v => v >= 2).length;

    // Average rating
    const rated = checkins.filter(c => c.rating != null);
    const avgRating = rated.length > 0
      ? parseFloat((rated.reduce((a, c) => a + c.rating, 0) / rated.length).toFixed(1))
      : null;

    // Top cigars
    const cigarCounts = {};
    for (const c of checkins) {
      const label = c.cigars ? `${c.cigars.brand} ${c.cigars.line}` : `${c.cigar_brand || ""} ${c.cigar_name || ""}`.trim();
      if (label) cigarCounts[label] = (cigarCounts[label] || 0) + 1;
    }
    const topCigars = Object.entries(cigarCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, count]) => ({ label, count }));

    // Check-ins by day of week
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    for (const c of checkins) dayCounts[new Date(c.created_at).getDay()]++;
    const byDay = dayNames.map((name, i) => ({ name, count: dayCounts[i] }));

    setStats({ total, unique, repeatVisitors, avgRating, topCigars, byDay });
    setLoading(false);
  };

  if (loading) return <div style={{ textAlign: "center", padding: "40px 0", fontSize: 13, color: "#5a4535" }}>Loading analytics...</div>;

  if (!stats || stats.total === 0) return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 36, marginBottom: 16 }}>📊</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#e8d5b7", marginBottom: 8 }}>No check-ins yet</div>
      <div style={{ fontSize: 13, color: "#5a4535", lineHeight: 1.6 }}>When Ashed users check in at your venue, their activity will appear here.</div>
    </div>
  );

  const maxDay = Math.max(...stats.byDay.map(d => d.count), 1);
  const maxCigar = stats.topCigars[0]?.count || 1;

  return (
    <div>
      {/* Stat boxes */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10, marginBottom: 24 }}>
        {[
          ["Total Visits", stats.total, "#7a8a9a"],
          ["Unique Visitors", stats.unique, "#c9a84c"],
          ["Repeat Visitors", stats.repeatVisitors, "#7a9a7a"],
          ["Avg Rating", stats.avgRating ?? "—", "#e8632a"],
        ].map(([label, value, color]) => (
          <div key={label} style={{ background: "#221508", border: `1px solid ${color}33`, borderRadius: 12, padding: "14px 12px", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: color, opacity: 0.6, borderRadius: "12px 12px 0 0" }} />
            <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: 10, color: "#6a5540", letterSpacing: 1, marginTop: 5 }}>{label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Busiest days */}
      <div style={{ background: "#221508", border: "1px solid #3a2510", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "#c8b89a", fontWeight: 600, marginBottom: 16 }}>Busiest Days</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
          {stats.byDay.map((d, i) => {
            const pct = Math.round((d.count / maxDay) * 100);
            const isZero = d.count === 0;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end", gap: 4 }}>
                {!isZero && <div style={{ fontSize: 10, color: "#7a8a9a", fontWeight: 700 }}>{d.count}</div>}
                <div style={{ width: "100%", borderRadius: "3px 3px 0 0", height: isZero ? 2 : `${Math.max(pct, 4)}%`, background: isZero ? "#2a1a0e" : "linear-gradient(180deg, #7a8a9aff 0%, #7a8a9a99 100%)", opacity: isZero ? 0.3 : 1 }} />
                <div style={{ fontSize: 10, color: "#7a6050" }}>{d.name}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top cigars */}
      <div style={{ background: "#221508", border: "1px solid #3a2510", borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 12, color: "#c8b89a", fontWeight: 600, marginBottom: 16 }}>Top Cigars Smoked Here</div>
        {stats.topCigars.map((c, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "#5a4535", width: 16, textAlign: "right", flexShrink: 0 }}>{i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: "#e8d5b7", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 4 }}>{c.label}</div>
              <div style={{ height: 5, background: "#2a1a0e", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${Math.round((c.count / maxCigar) * 100)}%`, height: "100%", background: "linear-gradient(90deg, #7a8a9a, #a0b0c0)", borderRadius: 3 }} />
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#7a8a9a", flexShrink: 0 }}>{c.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── LISTING ─────────────────────────────────────────────────────────────────

function ListingSection({ placeId, venue, onVenueUpdate }) {
  const [form, setForm] = useState({ name: "", address: "", phone: "", hours: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [msg, setMsg] = useState(null);
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    if (venue && (venue.address || venue.phone)) {
      // Already have saved data — use it
      setForm({
        name: venue.name || "",
        address: venue.address || "",
        phone: venue.phone || "",
        hours: venue.hours || "",
        description: venue.description || "",
      });
      setPrefilled(true);
    } else if (placeId && !prefilled) {
      // No saved data yet — fetch from Google and pre-populate
      fetchFromGoogle();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venue, placeId]);

  const fetchFromGoogle = async () => {
    setLoadingGoogle(true);
    try {
      const res = await fetch(`/api/places?action=details&place_id=${encodeURIComponent(placeId)}`);
      const data = await res.json();
      const r = data.result;
      if (r) {
        const hoursText = r.opening_hours?.weekday_text?.join("\n") || "";
        setForm(prev => ({
          ...prev,
          name: r.name || prev.name,
          address: r.formatted_address || prev.address,
          phone: r.formatted_phone_number || prev.phone,
          hours: hoursText || prev.hours,
        }));
        setPrefilled(true);
        setMsg({ text: "Pre-filled from Google Maps — review and save to confirm.", isError: false });
        setTimeout(() => setMsg(null), 5000);
      }
    } catch (e) {
      console.error("Google prefill error:", e);
    }
    setLoadingGoogle(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { data, error } = await supabase
      .from("places")
      .upsert({ place_id: placeId, ...form }, { onConflict: "place_id" })
      .select()
      .single();
    if (error) { setMsg({ text: "Error saving listing.", isError: true }); }
    else { onVenueUpdate(data); setMsg({ text: "Listing updated!", isError: false }); }
    setSaving(false);
    setTimeout(() => setMsg(null), 3000);
  };

  const Field = ({ label, field, multiline }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 6 }}>{label}</div>
      {multiline
        ? <textarea value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} rows={3}
            style={{ width: "100%", background: "#2a1a0e", border: "1px solid #4a3020", borderRadius: 8, padding: "10px 12px", color: "#e8d5b7", fontSize: 13, fontFamily: SANS, outline: "none", boxSizing: "border-box", resize: "vertical" }} />
        : <input value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
            style={{ width: "100%", background: "#2a1a0e", border: "1px solid #4a3020", borderRadius: 8, padding: "10px 12px", color: "#e8d5b7", fontSize: 13, fontFamily: SANS, outline: "none", boxSizing: "border-box" }} />
      }
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: "#c8b89a", fontWeight: 600 }}>Manage Your Listing</div>
        <button onClick={fetchFromGoogle} disabled={loadingGoogle}
          style={{ background: "none", border: "1px solid #3a2510", borderRadius: 20, padding: "4px 12px", color: "#8a7055", fontSize: 11, cursor: loadingGoogle ? "default" : "pointer", fontFamily: SANS }}>
          {loadingGoogle ? "Loading..." : "↻ Refresh from Google"}
        </button>
      </div>
      {msg && (
        <div style={{ background: msg.isError ? "#a0522d22" : "#7a9a7a22", border: `1px solid ${msg.isError ? "#a0522d55" : "#7a9a7a55"}`, borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: msg.isError ? "#e8a07a" : "#7a9a7a", textAlign: "center" }}>
          {msg.text}
        </div>
      )}
      <Field label="VENUE NAME" field="name" />
      <Field label="ADDRESS" field="address" />
      <Field label="PHONE" field="phone" />
      <Field label="HOURS" field="hours" />
      <Field label="DESCRIPTION" field="description" multiline />
      <button onClick={handleSave} disabled={saving}
        style={{ width: "100%", background: saving ? "#3a2510" : "linear-gradient(135deg, #7a8a9a, #5a6a7a)", border: "none", borderRadius: 10, padding: 14, color: saving ? "#5a4535" : "#e8d5b7", fontSize: 14, fontWeight: 700, cursor: saving ? "default" : "pointer", fontFamily: SANS }}>
        {saving ? "Saving..." : "Save Listing"}
      </button>
    </div>
  );
}

// ─── ANNOUNCEMENTS ────────────────────────────────────────────────────────────

function AnnounceSection({ placeId, user }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => { loadAnnouncements(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAnnouncements = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .eq("place_id", placeId)
      .order("created_at", { ascending: false });
    setAnnouncements(data || []);
    setLoading(false);
  };

  const handlePost = async () => {
    if (!text.trim()) return;
    setPosting(true);
    const { data, error } = await supabase
      .from("announcements")
      .insert({ place_id: placeId, user_id: user.id, content: text.trim() })
      .select()
      .single();
    if (!error && data) {
      setAnnouncements(prev => [data, ...prev]);
      setText("");
    } else {
      setMsg("Error posting announcement.");
      setTimeout(() => setMsg(null), 3000);
    }
    setPosting(false);
  };

  const handleDelete = async (id) => {
    await supabase.from("announcements").delete().eq("id", id);
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div>
      <div style={{ fontSize: 12, color: "#c8b89a", fontWeight: 600, marginBottom: 6 }}>Post Announcement</div>
      <div style={{ fontSize: 11, color: "#5a4535", marginBottom: 16 }}>Visible to users viewing your venue. Keep it short — events, new stock, specials.</div>

      {msg && <div style={{ background: "#a0522d22", border: "1px solid #a0522d55", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#e8a07a" }}>{msg}</div>}

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="e.g. Herf night this Friday 7pm. New Padron 1964 shipment just arrived!"
        rows={3}
        style={{ width: "100%", background: "#2a1a0e", border: "1px solid #4a3020", borderRadius: 8, padding: "10px 12px", color: "#e8d5b7", fontSize: 13, fontFamily: SANS, outline: "none", boxSizing: "border-box", resize: "vertical", marginBottom: 10 }}
      />
      <button onClick={handlePost} disabled={posting || !text.trim()}
        style={{ width: "100%", background: text.trim() ? "linear-gradient(135deg, #7a8a9a, #5a6a7a)" : "#2a1a0e", border: "none", borderRadius: 10, padding: 12, color: text.trim() ? "#e8d5b7" : "#5a4535", fontSize: 13, fontWeight: 700, cursor: text.trim() ? "pointer" : "default", fontFamily: SANS, marginBottom: 24 }}>
        {posting ? "Posting..." : "📣 Post Announcement"}
      </button>

      <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 1, marginBottom: 12 }}>POSTED ANNOUNCEMENTS</div>
      {loading && <div style={{ fontSize: 13, color: "#5a4535", textAlign: "center", padding: "20px 0" }}>Loading...</div>}
      {!loading && announcements.length === 0 && (
        <div style={{ fontSize: 13, color: "#5a4535", textAlign: "center", padding: "30px 0" }}>No announcements posted yet.</div>
      )}
      {announcements.map(a => (
        <div key={a.id} style={{ background: "#221508", border: "1px solid #3a2510", borderRadius: 10, padding: 14, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
            <div style={{ fontSize: 13, color: "#e8d5b7", lineHeight: 1.5, flex: 1 }}>{a.content}</div>
            <button onClick={() => handleDelete(a.id)}
              style={{ background: "none", border: "none", color: "#5a4535", fontSize: 16, cursor: "pointer", flexShrink: 0 }}>🗑</button>
          </div>
          <div style={{ fontSize: 11, color: "#5a4535", marginTop: 8 }}>
            {new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </div>
        </div>
      ))}
    </div>
  );
}