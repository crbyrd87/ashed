import { useState } from "react";
import { supabase } from "./supabase";

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export default function Settings({ user, onClose, onSignOut, onReplayTour }) {
  const [section, setSection] = useState("account");

  const displayName = user?.user_metadata?.display_name || "";
  const username = user?.user_metadata?.username?.replace(/^@/, "") || "";

  return (
    <div style={{ position: "fixed", inset: 0, background: "#1a0f08", zIndex: 600, display: "flex", flexDirection: "column", fontFamily: SANS }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 16px 12px", borderBottom: "1px solid #4a3520" }}>
        <button onClick={onClose}
          style={{ background: "none", border: "none", color: "#a08060", fontSize: 20, cursor: "pointer", padding: 4, lineHeight: 1 }}>
          ←
        </button>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#f5ead8" }}>Settings</div>
      </div>

      {/* Section tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #4a3520" }}>
        {[["account", "Account"], ["privacy", "Privacy"], ["guide", "Guide"], ["help", "Help"]].map(([id, label]) => (
          <button key={id} onClick={() => setSection(id)}
            style={{ flex: 1, background: "none", border: "none", borderBottom: `2px solid ${section === id ? "#d4b45a" : "transparent"}`, padding: "10px 0", color: section === id ? "#d4b45a" : "#7a6048", fontSize: 13, cursor: "pointer", fontFamily: SANS, fontWeight: section === id ? 700 : 400, textAlign: "center" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {section === "account" && <AccountSection user={user} displayName={displayName} username={username} onSignOut={onSignOut} />}
        {section === "privacy" && <PrivacySection user={user} />}
        {section === "guide"   && <GuideSection />}
        {section === "help"    && <HelpSection onReplayTour={onReplayTour} user={user} />}
      </div>
    </div>
  );
}

function Field({ label, value, onSave, type = "text", hint }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleSave = async () => {
    setSaving(true);
    const result = await onSave(val.trim());
    setSaving(false);
    if (result?.error) {
      setMsg({ text: result.error, isError: true });
    } else {
      setMsg({ text: "Saved!", isError: false });
      setEditing(false);
    }
    setTimeout(() => setMsg(null), 3000);
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, color: "#7a6048", letterSpacing: 1, marginBottom: 4 }}>{label}</div>
      {editing ? (
        <div>
          <input
            type={type}
            value={val}
            onChange={e => setVal(e.target.value)}
            style={{ width: "100%", background: "#2a1a0e", border: "1px solid #d4b45a", borderRadius: 8, padding: "10px 12px", color: "#f5ead8", fontSize: 14, fontFamily: SANS, outline: "none", boxSizing: "border-box" }}
            autoFocus
          />
          {hint && <div style={{ fontSize: 11, color: "#7a6048", marginTop: 4 }}>{hint}</div>}
          {msg && <div style={{ fontSize: 12, color: msg.isError ? "#e8a07a" : "#7a9a7a", marginTop: 4 }}>{msg.text}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={handleSave} disabled={saving}
              style={{ flex: 1, background: saving ? "#3a2510" : "linear-gradient(135deg, #d4b45a, #a07830)", border: "none", borderRadius: 8, padding: "9px 0", color: saving ? "#7a6048" : "#1a0f08", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
              {saving ? "Saving..." : "Save"}
            </button>
            <button onClick={() => { setEditing(false); setVal(value || ""); }}
              style={{ flex: 1, background: "none", border: "1px solid #4a3520", borderRadius: 8, padding: "9px 0", color: "#7a6048", fontSize: 13, cursor: "pointer", fontFamily: SANS }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#221508", border: "1px solid #4a3520", borderRadius: 8, padding: "10px 12px" }}>
          <span style={{ fontSize: 14, color: value ? "#f5ead8" : "#5a4535" }}>{value || "Not set"}</span>
          <button onClick={() => setEditing(true)}
            style={{ background: "none", border: "none", color: "#d4b45a", fontSize: 12, cursor: "pointer", fontFamily: SANS }}>
            Edit
          </button>
        </div>
      )}
    </div>
  );
}

function AccountSection({ user, displayName, username, onSignOut }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [msg, setMsg] = useState(null);

  const saveDisplayName = async (val) => {
    if (!val) return { error: "Display name cannot be empty." };
    const { error } = await supabase.auth.updateUser({ data: { display_name: val } });
    if (!error) await supabase.from("users").update({ display_name: val }).eq("id", user.id);
    return error ? { error: error.message } : {};
  };

  const saveEmail = async (val) => {
    if (!val) return { error: "Email cannot be empty." };
    const { error } = await supabase.auth.updateUser({ email: val });
    return error ? { error: error.message } : {};
  };

  const handlePasswordReset = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: "https://ashed.app",
    });
    if (error) {
      setMsg({ text: "Error sending reset email.", isError: true });
    } else {
      setMsg({ text: "Password reset email sent to " + user.email, isError: false });
    }
    setTimeout(() => setMsg(null), 5000);
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== "DELETE") return;
    // Sign out first, then delete via service key would be needed server-side
    // For now, flag the account for deletion and sign out
    await supabase.from("users").update({ flagged_for_deletion: true }).eq("id", user.id);
    await supabase.auth.signOut();
    onSignOut();
  };

  return (
    <div>
      <div style={{ fontSize: 11, color: "#7a6048", letterSpacing: 1, marginBottom: 16 }}>PROFILE</div>
      <Field label="DISPLAY NAME" value={displayName} onSave={saveDisplayName} />
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: "#7a6048", letterSpacing: 1, marginBottom: 4 }}>USERNAME</div>
        <div style={{ background: "#221508", border: "1px solid #4a3520", borderRadius: 8, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, color: "#5a4535" }}>{username ? `@${username}` : "Not set"}</span>
          <span style={{ fontSize: 11, color: "#5a4535" }}>Cannot be changed</span>
        </div>
      </div>
      
      <div style={{ fontSize: 11, color: "#7a6048", letterSpacing: 1, marginBottom: 16, marginTop: 24 }}>SECURITY</div>
      <Field label="EMAIL ADDRESS" value={user?.email} onSave={saveEmail} hint="A confirmation will be sent to your current email address." />

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: "#7a6048", letterSpacing: 1, marginBottom: 4 }}>PASSWORD</div>
        <div style={{ background: "#221508", border: "1px solid #4a3520", borderRadius: 8, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, color: "#5a4535" }}>••••••••</span>
          <button onClick={handlePasswordReset}
            style={{ background: "none", border: "none", color: "#d4b45a", fontSize: 12, cursor: "pointer", fontFamily: SANS }}>
            Reset via Email
          </button>
        </div>
        {msg && <div style={{ fontSize: 12, color: msg.isError ? "#e8a07a" : "#7a9a7a", marginTop: 6 }}>{msg.text}</div>}
      </div>

      <div style={{ fontSize: 11, color: "#7a6048", letterSpacing: 1, marginBottom: 16, marginTop: 24 }}>ACCOUNT ACTIONS</div>
      <button onClick={onSignOut}
        style={{ width: "100%", background: "none", border: "1px solid #4a3520", borderRadius: 10, padding: 14, color: "#a08060", fontSize: 14, cursor: "pointer", fontFamily: SANS, marginBottom: 10 }}>
        Sign Out
      </button>

      {!confirmDelete ? (
        <button onClick={() => setConfirmDelete(true)}
          style={{ width: "100%", background: "none", border: "1px solid #a0522d44", borderRadius: 10, padding: 14, color: "#a0522d", fontSize: 14, cursor: "pointer", fontFamily: SANS }}>
          Delete Account
        </button>
      ) : (
        <div style={{ background: "#221508", border: "1px solid #a0522d44", borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 13, color: "#e8a07a", marginBottom: 12, lineHeight: 1.6 }}>
            This will permanently delete your account and all your data. Type <strong>DELETE</strong> to confirm.
          </div>
          <input value={deleteInput} onChange={e => setDeleteInput(e.target.value)}
            placeholder="Type DELETE"
            style={{ width: "100%", background: "#1a0f08", border: "1px solid #a0522d", borderRadius: 8, padding: "10px 12px", color: "#f5ead8", fontSize: 14, fontFamily: SANS, outline: "none", boxSizing: "border-box", marginBottom: 10 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleDeleteAccount} disabled={deleteInput !== "DELETE"}
              style={{ flex: 1, background: deleteInput === "DELETE" ? "#a0522d" : "#3a2510", border: "none", borderRadius: 8, padding: 10, color: deleteInput === "DELETE" ? "#f5ead8" : "#5a4535", fontSize: 13, fontWeight: 700, cursor: deleteInput === "DELETE" ? "pointer" : "default", fontFamily: SANS }}>
              Delete Forever
            </button>
            <button onClick={() => { setConfirmDelete(false); setDeleteInput(""); }}
              style={{ flex: 1, background: "none", border: "1px solid #4a3520", borderRadius: 8, padding: 10, color: "#7a6048", fontSize: 13, cursor: "pointer", fontFamily: SANS }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PrivacySection({ user }) {
  const [privateProfile, setPrivateProfile] = useState(false);
  const [privateCheckins, setPrivateCheckins] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!loaded) {
    supabase.from("users").select("private_profile, default_private_checkins").eq("id", user.id).single()
      .then(({ data }) => {
        if (data) {
          setPrivateProfile(data.private_profile || false);
          setPrivateCheckins(data.default_private_checkins || false);
        }
        setLoaded(true);
      });
  }

  const toggle = async (field, val, setter) => {
    setSaving(true);
    setter(val);
    await supabase.from("users").update({ [field]: val }).eq("id", user.id);
    setSaving(false);
  };

  const Toggle = ({ label, sublabel, value, onChange }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#221508", border: "1px solid #4a3520", borderRadius: 10, padding: "14px 16px", marginBottom: 10 }}>
      <div>
        <div style={{ fontSize: 14, color: "#f5ead8" }}>{label}</div>
        {sublabel && <div style={{ fontSize: 12, color: "#7a6048", marginTop: 2 }}>{sublabel}</div>}
      </div>
      <button onClick={() => onChange(!value)} disabled={saving}
        style={{ width: 44, height: 24, borderRadius: 12, background: value ? "#d4b45a" : "#3a2510", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
        <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#f5ead8", position: "absolute", top: 3, left: value ? 23 : 3, transition: "left 0.2s" }} />
      </button>
    </div>
  );

  return (
    <div>
      <div style={{ fontSize: 11, color: "#7a6048", letterSpacing: 1, marginBottom: 16 }}>PRIVACY</div>
      {!loaded ? (
        <div style={{ fontSize: 13, color: "#5a4535", textAlign: "center", padding: "20px 0" }}>Loading...</div>
      ) : (
        <>
          <Toggle
            label="Private Profile"
            sublabel="Only friends can see your journal and stats"
            value={privateProfile}
            onChange={val => toggle("private_profile", val, setPrivateProfile)}
          />
          <Toggle
            label="Private Check-ins by Default"
            sublabel="New check-ins will be private unless you change them"
            value={privateCheckins}
            onChange={val => toggle("default_private_checkins", val, setPrivateCheckins)}
          />
        </>
      )}
      <div style={{ fontSize: 12, color: "#5a4535", marginTop: 16, lineHeight: 1.6 }}>
        Individual check-in visibility can always be changed from your journal.
      </div>
    </div>
  );
}

function GuideSection() {
  const [openSection, setOpenSection] = useState(null);

  const toggle = (id) => setOpenSection(prev => prev === id ? null : id);

  const Section = ({ id, title, children }) => (
    <div style={{ marginBottom: 10 }}>
      <button onClick={() => toggle(id)}
        style={{ width: "100%", background: "#221508", border: "1px solid #4a3520", borderRadius: openSection === id ? "10px 10px 0 0" : 10, padding: "14px 16px", color: "#f5ead8", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: SANS, display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left" }}>
        {title}
        <span style={{ color: "#d4b45a", fontSize: 16 }}>{openSection === id ? "−" : "+"}</span>
      </button>
      {openSection === id && (
        <div style={{ background: "#1e1208", border: "1px solid #4a3520", borderTop: "none", borderRadius: "0 0 10px 10px", padding: "14px 16px" }}>
          {children}
        </div>
      )}
    </div>
  );

  const Row = ({ label, value, sub }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 0", borderBottom: "1px solid #2a1a0e" }}>
      <div>
        <div style={{ fontSize: 13, color: "#f5ead8", fontWeight: 600 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: "#7a6048", marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ fontSize: 13, color: "#a08060", textAlign: "right", maxWidth: "55%", lineHeight: 1.4 }}>{value}</div>
    </div>
  );

  const Term = ({ word, def }) => (
    <div style={{ padding: "8px 0", borderBottom: "1px solid #2a1a0e" }}>
      <div style={{ fontSize: 13, color: "#d4b45a", fontWeight: 600, marginBottom: 2 }}>{word}</div>
      <div style={{ fontSize: 12, color: "#a08060", lineHeight: 1.5 }}>{def}</div>
    </div>
  );

  return (
    <div>
      <div style={{ fontSize: 11, color: "#7a6048", letterSpacing: 1, marginBottom: 16 }}>CIGAR GUIDE</div>

      <Section id="vitolas" title="🎋 Vitola Size Chart">
        <div style={{ fontSize: 11, color: "#7a6048", marginBottom: 10 }}>Size affects burn time, draw, and smoke temperature.</div>
        <Row label="Petit Corona" value='4–4.5" × 40–42 ring' sub="~20–30 min" />
        <Row label="Corona" value='5.5" × 42 ring' sub="~30–45 min" />
        <Row label="Robusto" value='4.75–5.5" × 48–52 ring' sub="~45–60 min" />
        <Row label="Toro" value='6" × 50–52 ring' sub="~60–75 min" />
        <Row label="Churchill" value='7" × 47–50 ring' sub="~60–90 min" />
        <Row label="Belicoso" value='5–5.5" × 50–52 ring' sub="Pointed head" />
        <Row label="Torpedo" value='6–7" × 52–54 ring' sub="Pointed head, wide body" />
        <Row label="Gordo/60 Ring" value='6" × 60 ring' sub="~75–90 min, very full" />
        <Row label="Lancero/Panetela" value='7+" × 38–40 ring' sub="Slim, long — complex draw" />
        <Row label="Perfecto" value="Varies" sub="Tapered at both ends" />
        <div style={{ fontSize: 11, color: "#5a4535", marginTop: 10 }}>Ring gauge = diameter in 64ths of an inch. A 52 ring = 52/64" wide.</div>
      </Section>

      <Section id="strength" title="💪 Body & Strength Guide">
        <div style={{ fontSize: 11, color: "#7a6048", marginBottom: 10 }}>Strength = nicotine hit. Body = complexity and flavor intensity. They don't always match.</div>
        <Row label="Light" value="Mild, smooth, little nicotine" sub="Good for beginners" />
        <Row label="Medium" value="Balanced flavor and nicotine" sub="Most popular range" />
        <Row label="Medium-Full" value="More complexity, noticeable nicotine" sub="For experienced smokers" />
        <Row label="Full" value="Bold, rich, strong nicotine hit" sub="Smoke after a meal" />
        <div style={{ fontSize: 12, color: "#a08060", marginTop: 10, lineHeight: 1.6 }}>
          💡 A cigar can be full-bodied (complex flavor) but medium strength (low nicotine) — like a Padron 1964. Don't confuse the two.
        </div>
      </Section>

      <Section id="wrappers" title="🍂 Wrapper Types">
        <div style={{ fontSize: 11, color: "#7a6048", marginBottom: 10 }}>The wrapper leaf covers ~60% of what you taste.</div>
        <Row label="Claro" value="Light tan, mild and creamy" />
        <Row label="Colorado Claro" value="Medium brown, balanced" />
        <Row label="Colorado" value="Reddish-brown, full flavor" />
        <Row label="Colorado Maduro" value="Dark brown, rich and sweet" />
        <Row label="Maduro" value="Very dark, fermented longer — sweet, earthy, full" />
        <Row label="Oscuro" value="Almost black, strongest maduro" />
        <Row label="Natural" value="Light, slightly oily — Connecticut style" />
        <Row label="Candela" value="Green, very rare, grassy/sweet" />
        <div style={{ fontSize: 11, color: "#5a4535", marginTop: 10 }}>Common origins: Connecticut (mild), Ecuadorian Habano (spicy), Nicaraguan (bold), Cameroon (complex), San Andrés (maduro).</div>
      </Section>

      <Section id="origins" title="🌍 Origins Guide">
        <Row label="Nicaragua" value="Spicy, complex, full-bodied. Jalapa and Estelí valleys." />
        <Row label="Dominican Republic" value="Smooth, creamy, medium body. Long tradition of quality." />
        <Row label="Honduras" value="Earthy, woody, medium-full. Often blended." />
        <Row label="Cuba" value="The original benchmark. Earthy, floral, nuanced. Limited availability." />
        <Row label="Ecuador" value="Known for wrapper leaves. Consistent humidity produces oily, even wrappers." />
        <Row label="Mexico" value="San Andrés maduro wrapper capital. Earthy and sweet." />
        <Row label="Peru" value="Emerging region. Similar profile to Nicaragua." />
        <Row label="Brazil" value="Mata Fina wrappers — oily, sweet, very dark." />
        <Row label="Cameroon" value="African wrapper leaf. Unique spice and wood notes." />
      </Section>

      <Section id="tasting" title="👅 Tasting Terms Glossary">
        <Term word="Retrohale" def="Exhaling smoke through your nose to intensify flavor. Practice slowly — it's an acquired technique." />
        <Term word="Draw" def="The resistance when pulling air through the cigar. Should feel like sipping through a slightly restricted straw." />
        <Term word="Burn" def="How evenly the cigar burns. A good cigar burns evenly without needing constant touch-ups." />
        <Term word="Ash" def="Firm, white ash signals quality tobacco and a good burn. Flaky grey ash may indicate uneven aging." />
        <Term word="Pepper" def="A sharp spice — most common on the palate and retrohale in Nicaraguan cigars." />
        <Term word="Earthiness" def="A soil or forest floor note — common in full-bodied cigars." />
        <Term word="Creaminess" def="A smooth, buttery texture — often from Connecticut wrappers or Dominican tobacco." />
        <Term word="Sweetness" def="Natural sweetness from maduro wrappers or fermentation. Not artificial — more like cocoa or dried fruit." />
        <Term word="Complexity" def="How much the flavor changes as you smoke. A complex cigar evolves from first third to last." />
        <Term word="Transition" def="When flavor noticeably shifts — usually at the first and second third marks." />
        <Term word="Finish" def="The flavor that lingers after you exhale. A long, pleasant finish is a sign of quality." />
        <Term word="Plug" def="A blockage in the cigar that restricts draw. Sometimes resolved by gently squeezing the cigar." />
      </Section>

      <Section id="etiquette" title="🎩 Lounge & Smoking Etiquette">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            "Never cut someone else's cigar without asking.",
            "Don't stub out a cigar like a cigarette — set it in the ashtray and let it go out naturally.",
            "Ash when it naturally falls or is long enough to drop. Don't tap obsessively.",
            "In a lounge, always ask before lighting up near others if in a non-smoking section.",
            "Don't blow smoke in anyone's direction.",
            "It's fine to relight a cigar within the first hour. After that, it may taste harsh.",
            "Don't comment negatively on someone else's cigar choice — taste is personal.",
          ].map((tip, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ color: "#d4b45a", flexShrink: 0 }}>•</span>
              <span style={{ fontSize: 13, color: "#a08060", lineHeight: 1.5 }}>{tip}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function HelpSection({ onReplayTour, user }) {
  const [type, setType] = useState("bug");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!description.trim()) return;
    setSubmitting(true);
    setError(null);

    // Get PostHog session ID if available
    let posthogSessionId = null;
    try {
      // eslint-disable-next-line no-undef
      posthogSessionId = window.posthog?.get_session_id?.() || null;
    } catch (e) {}

    const { error: dbError } = await supabase
      .from("feedback")
      .insert({
        user_id: user?.id || null,
        type,
        description: description.trim(),
        posthog_session_id: posthogSessionId,
      });

    setSubmitting(false);
    if (dbError) {
      setError("Something went wrong. Please try again.");
    } else {
      setSubmitted(true);
      setDescription("");
    }
  };

  return (
    <div>
      <div style={{ fontSize: 11, color: "#7a6048", letterSpacing: 1, marginBottom: 16 }}>REPORT A BUG / GIVE FEEDBACK</div>

      {submitted ? (
        <div style={{ background: "#7a9a7a22", border: "1px solid #7a9a7a55", borderRadius: 10, padding: 20, textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 14, color: "#7a9a7a", fontWeight: 700, marginBottom: 4 }}>Thanks for the report!</div>
          <div style={{ fontSize: 12, color: "#5a4535" }}>We'll look into it and follow up if needed.</div>
          <button onClick={() => setSubmitted(false)}
            style={{ marginTop: 14, background: "none", border: "1px solid #4a3520", borderRadius: 8, padding: "8px 16px", color: "#7a6048", fontSize: 12, cursor: "pointer", fontFamily: SANS }}>
            Submit Another
          </button>
        </div>
      ) : (
        <>
          {/* Type selector */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[["bug", "🐛 Bug Report"], ["feedback", "💡 Feedback"]].map(([val, label]) => (
              <button key={val} onClick={() => setType(val)}
                style={{ flex: 1, background: type === val ? "#d4b45a22" : "none", border: `1px solid ${type === val ? "#d4b45a" : "#4a3520"}`, borderRadius: 8, padding: "10px 0", color: type === val ? "#d4b45a" : "#7a6048", fontSize: 13, fontWeight: type === val ? 700 : 400, cursor: "pointer", fontFamily: SANS }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ fontSize: 10, color: "#7a6048", letterSpacing: 1, marginBottom: 6 }}>
            {type === "bug" ? "DESCRIBE THE BUG — WHAT HAPPENED?" : "WHAT'S ON YOUR MIND?"}
          </div>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={type === "bug"
              ? "e.g. When I tap the fire button on a check-in, the count doesn't update..."
              : "e.g. It would be great if I could filter my journal by brand..."}
            rows={5}
            style={{ width: "100%", background: "#221508", border: "1px solid #4a3520", borderRadius: 8, padding: "10px 12px", color: "#f5ead8", fontSize: 13, fontFamily: SANS, outline: "none", resize: "none", boxSizing: "border-box", marginBottom: 8 }}
          />
          {error && <div style={{ fontSize: 12, color: "#e8a07a", marginBottom: 8 }}>{error}</div>}
          <div style={{ fontSize: 11, color: "#5a4535", marginBottom: 12 }}>
            {type === "bug" ? "Your session replay will be attached so we can see exactly what happened." : "Your feedback helps us build a better app."}
          </div>
          <button onClick={handleSubmit} disabled={submitting || !description.trim()}
            style={{ width: "100%", background: description.trim() ? "linear-gradient(135deg, #d4b45a, #a07830)" : "#2a1a0e", border: "none", borderRadius: 10, padding: 14, color: description.trim() ? "#1a0f08" : "#5a4535", fontSize: 14, fontWeight: 700, cursor: description.trim() ? "pointer" : "default", fontFamily: SANS }}>
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </>
      )}

      <div style={{ height: 1, background: "#3a2510", margin: "24px 0" }} />

      <div style={{ fontSize: 11, color: "#7a6048", letterSpacing: 1, marginBottom: 16 }}>HELP & SUPPORT</div>

      <button onClick={onReplayTour}
        style={{ width: "100%", background: "#221508", border: "1px solid #4a3520", borderRadius: 10, padding: 14, color: "#d4b45a", fontSize: 14, cursor: "pointer", fontFamily: SANS, textAlign: "left", marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}>
        <span>🎯</span> Replay Onboarding Tour
      </button>

      <a href="mailto:support@ashed.app"
        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", background: "#221508", border: "1px solid #4a3520", borderRadius: 10, padding: 14, color: "#a08060", fontSize: 14, cursor: "pointer", fontFamily: SANS, textDecoration: "none", marginBottom: 10, boxSizing: "border-box" }}>
        <span>✉️</span> Contact Support
      </a>

      <a href="https://ashed.app/privacy" target="_blank" rel="noreferrer"
        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", background: "#221508", border: "1px solid #4a3520", borderRadius: 10, padding: 14, color: "#a08060", fontSize: 14, cursor: "pointer", fontFamily: SANS, textDecoration: "none", marginBottom: 10, boxSizing: "border-box" }}>
        <span>🔒</span> Privacy Policy
      </a>

      <a href="https://ashed.app/terms" target="_blank" rel="noreferrer"
        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", background: "#221508", border: "1px solid #4a3520", borderRadius: 10, padding: 14, color: "#a08060", fontSize: 14, cursor: "pointer", fontFamily: SANS, textDecoration: "none", marginBottom: 10, boxSizing: "border-box" }}>
        <span>📄</span> Terms of Service
      </a>

      <div style={{ marginTop: 24, textAlign: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#d4b45a", letterSpacing: 2 }}>ASHED</div>
        <div style={{ fontSize: 11, color: "#5a4535", marginTop: 4 }}>Version 0.9.2 (Alpha) · ashed.app</div>
      </div>
    </div>
  );
}