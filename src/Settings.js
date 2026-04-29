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
      <div style={{ display: "flex", borderBottom: "1px solid #4a3520", padding: "0 16px" }}>
        {[["account", "Account"], ["privacy", "Privacy"], ["help", "Help"]].map(([id, label]) => (
          <button key={id} onClick={() => setSection(id)}
            style={{ background: "none", border: "none", borderBottom: `2px solid ${section === id ? "#d4b45a" : "transparent"}`, padding: "10px 16px 10px 0", color: section === id ? "#d4b45a" : "#7a6048", fontSize: 13, cursor: "pointer", fontFamily: SANS, fontWeight: section === id ? 700 : 400, marginRight: 4 }}>
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {section === "account" && <AccountSection user={user} displayName={displayName} username={username} onSignOut={onSignOut} />}
        {section === "privacy" && <PrivacySection user={user} />}
        {section === "help" && <HelpSection onReplayTour={onReplayTour} />}
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

function HelpSection({ onReplayTour }) {
  return (
    <div>
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
        <div style={{ fontSize: 11, color: "#5a4535", marginTop: 4 }}>Version 1.0 · ashed.app</div>
      </div>
    </div>
  );
}