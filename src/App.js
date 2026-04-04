import { useState, useEffect } from "react";
import Auth from "./Auth";
import { supabase } from "./supabase";

const CIGARS = [
  { id: 1, brand: "Arturo Fuente", line: "Opus X", vitola: "Robusto", wrapper: "Dominican", strength: "Full", rating: 97, origin: "Dominican Republic", price: 32, smoked: true, smokedDate: "Feb 28, 2026", userRating: 94, notes: "Incredible complexity, leather and cedar up front.", img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80" },
  { id: 2, brand: "Padron", line: "1964 Anniversary", vitola: "Torpedo", wrapper: "Nicaragua", strength: "Full", rating: 96, origin: "Nicaragua", price: 24, smoked: true, smokedDate: "Feb 14, 2026", userRating: 96, notes: "Rich cocoa and espresso. One of the best I've had.", img: "https://images.unsplash.com/photo-1611048267451-e6ed903d4a38?w=400&q=80" },
  { id: 3, brand: "Cohiba", line: "Behike 54", vitola: "Toro", wrapper: "Cuba", strength: "Medium-Full", rating: 98, origin: "Cuba", price: 70, smoked: false, img: "https://images.unsplash.com/photo-1567446537708-ac4aa75c9c28?w=400&q=80" },
  { id: 4, brand: "My Father", line: "Le Bijou 1922", vitola: "Torpedo", wrapper: "Ecuador", strength: "Full", rating: 95, origin: "Nicaragua", price: 18, smoked: false, img: "https://images.unsplash.com/photo-1542601906897-ecd2f70b1a43?w=400&q=80" },
  { id: 5, brand: "Oliva", line: "Serie V", vitola: "Lancero", wrapper: "Nicaragua", strength: "Full", rating: 94, origin: "Nicaragua", price: 12, smoked: true, smokedDate: "Jan 30, 2026", userRating: 91, notes: "Spicy pepper with a smooth finish. Great value.", img: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=80" },
  { id: 6, brand: "Rocky Patel", line: "Vintage 1990", vitola: "Churchill", wrapper: "Ecuador", strength: "Medium", rating: 92, origin: "Honduras", price: 14, smoked: false, img: "https://images.unsplash.com/photo-1497515114629-f71d768fd07c?w=400&q=80" },
  { id: 7, brand: "Liga Privada", line: "No. 9", vitola: "Robusto", wrapper: "Connecticut Broadleaf", strength: "Full", rating: 96, origin: "Nicaragua", price: 20, smoked: true, smokedDate: "Jan 15, 2026", userRating: 98, notes: "Dark chocolate and earth. My go-to special occasion cigar.", img: "https://images.unsplash.com/photo-1511920170033-f8396924c348?w=400&q=80" },
  { id: 8, brand: "Davidoff", line: "Year of the Rabbit", vitola: "Robusto", wrapper: "Ecuador", strength: "Medium", rating: 93, origin: "Dominican Republic", price: 45, smoked: false, img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80" },
];

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const strengthColor = s => ({ "Light": "#a8c5a0", "Medium": "#d4b483", "Medium-Full": "#c4894a", "Full": "#a0522d" }[s] || "#888");

const Badge = ({ label, color = "#c9a84c" }) => (
  <span style={{ background: color + "22", color, border: `1px solid ${color}55`, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>{label}</span>
);

const ScoreBar = ({ rating }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
    <div style={{ width: 60, height: 6, background: "#3a2a1a", borderRadius: 3, overflow: "hidden" }}>
      <div style={{ width: `${rating}%`, height: "100%", background: "linear-gradient(90deg, #c9a84c, #e8cc7a)", borderRadius: 3 }} />
    </div>
    <span style={{ color: "#c9a84c", fontSize: 14, fontWeight: 700 }}>{rating}</span>
  </div>
);

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tab, setTab] = useState("search");
  const [query, setQuery] = useState("");
  const [strengthFilter, setStrengthFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [imgErrors, setImgErrors] = useState({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const smoked = CIGARS.filter(c => c.smoked);
  const avgRating = Math.round(smoked.reduce((a, c) => a + c.userRating, 0) / smoked.length);

  const filtered = CIGARS.filter(c => {
    const q = query.toLowerCase();
    const matchQ = !q || c.brand.toLowerCase().includes(q) || c.line.toLowerCase().includes(q) || c.vitola.toLowerCase().includes(q);
    const matchS = strengthFilter === "All" || c.strength === strengthFilter;
    return matchQ && matchS;
  });

  const fallbackImg = () => `https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80`;

  const s = {
    app: { fontFamily: SANS, background: "#1a0f08", minHeight: "100vh", color: "#e8d5b7", maxWidth: 420, margin: "0 auto", paddingBottom: 70 },
    header: { background: "linear-gradient(180deg, #2d1810 0%, #1a0f08 100%)", padding: "20px 20px 12px", borderBottom: "1px solid #3a2510", display: "flex", justifyContent: "space-between", alignItems: "center" },
    nav: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 420, background: "#1a0f08", borderTop: "1px solid #3a2510", display: "flex", zIndex: 100 },
    navBtn: a => ({ flex: 1, padding: "12px 0", background: "none", border: "none", color: a ? "#c9a84c" : "#5a4535", fontSize: 11, letterSpacing: 1, cursor: "pointer", fontFamily: SANS, textTransform: "uppercase", fontWeight: a ? 700 : 400 }),
    card: { background: "linear-gradient(135deg, #2a1a0e 0%, #221508 100%)", border: "1px solid #3a2510", borderRadius: 10, marginBottom: 10, cursor: "pointer", overflow: "hidden" },
    input: { width: "100%", background: "#2a1a0e", border: "1px solid #4a3020", borderRadius: 8, padding: "10px 14px", color: "#e8d5b7", fontSize: 14, fontFamily: SANS, outline: "none", boxSizing: "border-box" },
    pill: a => ({ padding: "5px 14px", borderRadius: 20, border: `1px solid ${a ? "#c9a84c" : "#3a2510"}`, background: a ? "#c9a84c22" : "transparent", color: a ? "#c9a84c" : "#8a7055", fontSize: 12, cursor: "pointer", fontFamily: SANS, whiteSpace: "nowrap" }),
    statBox: { background: "#2a1a0e", border: "1px solid #3a2510", borderRadius: 10, padding: "14px 18px", flex: 1, textAlign: "center" },
    logoutBtn: { background: "none", border: "1px solid #3a2510", borderRadius: 20, padding: "4px 12px", color: "#8a7055", fontSize: 11, cursor: "pointer", fontFamily: SANS },
  };

  if (authLoading) return (
    <div style={{ background: "#1a0f08", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#c9a84c", fontFamily: SANS, fontSize: 16, letterSpacing: 2 }}>
      Loading...
    </div>
  );

  if (!user) return <Auth onLogin={() => supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user))} />;

  if (selected) {
    const c = selected;
    return (
      <div style={{ ...s.app, overflowY: "auto" }}>
        <div style={{ position: "relative", height: 220 }}>
          <img src={imgErrors[c.id] ? fallbackImg() : c.img} onError={() => setImgErrors(p => ({ ...p, [c.id]: true }))} alt={c.line} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, #1a0f0844 0%, #1a0f08 100%)" }} />
          <button onClick={() => setSelected(null)} style={{ position: "absolute", top: 16, left: 16, background: "#1a0f08bb", border: "1px solid #3a2510", color: "#c9a84c", fontSize: 12, cursor: "pointer", padding: "6px 12px", borderRadius: 20, fontFamily: SANS }}>← Back</button>
          {c.smoked && <div style={{ position: "absolute", top: 16, right: 16, background: "#c9a84cdd", color: "#1a0f08", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20 }}>✓ SMOKED</div>}
        </div>
        <div style={{ padding: "0 20px 30px" }}>
          <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 2, textTransform: "uppercase", marginTop: 16 }}>{c.brand}</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#e8d5b7", margin: "4px 0 8px" }}>{c.line}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <Badge label={c.vitola} />
            <Badge label={c.strength} color={strengthColor(c.strength)} />
            <Badge label={c.origin} color="#7a9a7a" />
          </div>
          <ScoreBar rating={c.rating} />
          <div style={{ fontSize: 11, color: "#8a7055", marginTop: 4, marginBottom: 20 }}>CRITIC SCORE</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            {[["Wrapper", c.wrapper], ["Strength", c.strength], ["Vitola", c.vitola], ["Price", `$${c.price}`]].map(([k, v]) => (
              <div key={k} style={{ background: "#2a1a0e", border: "1px solid #3a2510", borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 10, color: "#8a7055", letterSpacing: 1, textTransform: "uppercase" }}>{k}</div>
                <div style={{ fontSize: 15, color: "#e8d5b7", marginTop: 3 }}>{v}</div>
              </div>
            ))}
          </div>
          {c.smoked ? (
            <div style={{ background: "#2a1a0e", border: "1px solid #c9a84c44", borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 11, color: "#c9a84c", letterSpacing: 2, marginBottom: 10 }}>YOUR REVIEW · {c.smokedDate}</div>
              <ScoreBar rating={c.userRating} />
              <div style={{ fontSize: 14, color: "#c8b89a", lineHeight: 1.6, fontStyle: "italic", marginTop: 10 }}>"{c.notes}"</div>
            </div>
          ) : (
            <button style={{ width: "100%", background: "linear-gradient(135deg, #c9a84c, #a07830)", border: "none", borderRadius: 10, padding: 14, color: "#1a0f08", fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: 2, fontFamily: SANS }}>
              + LOG THIS SMOKE
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={s.app}>
      <div style={s.header}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 4, color: "#c9a84c", textTransform: "uppercase" }}>🚬 Ashed</div>
          <div style={{ fontSize: 11, color: "#8a7055", letterSpacing: 2, marginTop: 2 }}>YOUR CIGAR JOURNAL</div>
        </div>
        <button style={s.logoutBtn} onClick={handleLogout}>Log out</button>
      </div>

      {tab === "search" && (
        <div style={{ padding: 16 }}>
          <input style={s.input} placeholder="Search cigars, brands, vitolas..." value={query} onChange={e => setQuery(e.target.value)} />
          <div style={{ display: "flex", gap: 8, margin: "12px 0", overflowX: "auto", paddingBottom: 4 }}>
            {["All", "Light", "Medium", "Medium-Full", "Full"].map(f => (
              <button key={f} style={s.pill(strengthFilter === f)} onClick={() => setStrengthFilter(f)}>{f}</button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "#5a4535", letterSpacing: 1, marginBottom: 10 }}>{filtered.length} CIGARS</div>
          {filtered.map(c => (
            <div key={c.id} style={{ ...s.card, borderColor: c.smoked ? "#c9a84c33" : "#3a2510" }} onClick={() => setSelected(c)}>
              <div style={{ display: "flex" }}>
                <div style={{ width: 90, flexShrink: 0 }}>
                  <img src={imgErrors[c.id] ? fallbackImg() : c.img} onError={() => setImgErrors(p => ({ ...p, [c.id]: true }))} alt={c.line} style={{ width: 90, height: 90, objectFit: "cover" }} />
                </div>
                <div style={{ flex: 1, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, color: "#8a7055", letterSpacing: 1 }}>{c.brand.toUpperCase()}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#e8d5b7", margin: "2px 0 6px" }}>{c.line}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Badge label={c.strength} color={strengthColor(c.strength)} />
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 20, fontWeight: 700, color: "#c9a84c" }}>{c.rating}</span>
                      {c.smoked && <div style={{ fontSize: 9, color: "#c9a84c" }}>✓ SMOKED</div>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "profile" && (
        <div style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, padding: "16px 0", borderBottom: "1px solid #3a2510" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #c9a84c, #7a4a20)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>👤</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#e8d5b7" }}>{user.email}</div>
              <div style={{ fontSize: 12, color: "#8a7055" }}>Member since {new Date(user.created_at).getFullYear()}</div>
              <div style={{ marginTop: 6 }}><Badge label="🏅 Aficionado" color="#c9a84c" /></div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            {[["Smoked", smoked.length], ["Avg Rating", avgRating], ["Wishlist", CIGARS.filter(c => !c.smoked).length]].map(([k, v]) => (
              <div key={k} style={s.statBox}>
                <div style={{ fontSize: 26, fontWeight: 700, color: "#c9a84c" }}>{v}</div>
                <div style={{ fontSize: 10, color: "#8a7055", letterSpacing: 1, marginTop: 2 }}>{k.toUpperCase()}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "#8a7055", letterSpacing: 2, marginBottom: 10 }}>SMOKING HISTORY</div>
          {smoked.map(c => (
            <div key={c.id} style={{ ...s.card, borderColor: "#c9a84c33" }} onClick={() => setSelected(c)}>
              <div style={{ display: "flex" }}>
                <img src={imgErrors[c.id] ? fallbackImg() : c.img} onError={() => setImgErrors(p => ({ ...p, [c.id]: true }))} alt={c.line} style={{ width: 80, height: 80, objectFit: "cover", flexShrink: 0 }} />
                <div style={{ flex: 1, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, color: "#8a7055" }}>{c.smokedDate}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#e8d5b7", margin: "2px 0 4px" }}>{c.line}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 11, color: "#8a7055" }}>{c.vitola}</div>
                    <span style={{ fontSize: 20, fontWeight: 700, color: "#c9a84c" }}>{c.userRating}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div style={{ fontSize: 12, color: "#8a7055", letterSpacing: 2, margin: "20px 0 10px" }}>WISHLIST</div>
          {CIGARS.filter(c => !c.smoked).map(c => (
            <div key={c.id} style={s.card} onClick={() => setSelected(c)}>
              <div style={{ display: "flex" }}>
                <img src={imgErrors[c.id] ? fallbackImg() : c.img} onError={() => setImgErrors(p => ({ ...p, [c.id]: true }))} alt={c.line} style={{ width: 80, height: 80, objectFit: "cover", flexShrink: 0 }} />
                <div style={{ flex: 1, padding: "10px 12px" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#e8d5b7", marginBottom: 4 }}>{c.line}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 11, color: "#8a7055" }}>{c.brand}</div>
                    <span style={{ fontSize: 20, fontWeight: 700, color: "#c9a84c" }}>{c.rating}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <nav style={s.nav}>
        {[["search", "🔍", "Explore"], ["profile", "👤", "Profile"]].map(([id, icon, label]) => (
          <button key={id} style={s.navBtn(tab === id)} onClick={() => setTab(id)}>{icon} {label}</button>
        ))}
      </nav>
    </div>
  );
}