import { useState } from "react";
import { supabase } from "./supabase";

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const s = {
    wrap: { fontFamily: SANS, background: "#1a0f08", minHeight: "100vh", color: "#e8d5b7", maxWidth: 420, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px" },
    logo: { fontSize: 28, fontWeight: 700, letterSpacing: 4, color: "#c9a84c", textTransform: "uppercase", marginBottom: 6 },
    tagline: { fontSize: 11, color: "#8a7055", letterSpacing: 2, marginBottom: 40 },
    card: { width: "100%", background: "#2a1a0e", border: "1px solid #3a2510", borderRadius: 14, padding: 24 },
    title: { fontSize: 18, fontWeight: 700, color: "#e8d5b7", marginBottom: 20 },
    label: { fontSize: 12, color: "#8a7055", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6, display: "block" },
    input: { width: "100%", background: "#1a0f08", border: "1px solid #4a3020", borderRadius: 8, padding: "12px 14px", color: "#e8d5b7", fontSize: 15, fontFamily: SANS, outline: "none", boxSizing: "border-box", marginBottom: 16 },
    btn: { width: "100%", background: "linear-gradient(135deg, #c9a84c, #a07830)", border: "none", borderRadius: 10, padding: 14, color: "#1a0f08", fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: 1, fontFamily: SANS, marginTop: 4 },
    btnDisabled: { width: "100%", background: "#3a2510", border: "none", borderRadius: 10, padding: 14, color: "#5a4535", fontSize: 15, fontWeight: 700, fontFamily: SANS, marginTop: 4 },
    toggle: { textAlign: "center", marginTop: 16, fontSize: 13, color: "#8a7055" },
    toggleLink: { color: "#c9a84c", cursor: "pointer", fontWeight: 600 },
    error: { background: "#a0522d22", border: "1px solid #a0522d55", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#e8a07a", marginBottom: 16 },
    success: { background: "#7a9a7a22", border: "1px solid #7a9a7a55", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#a8c5a0", marginBottom: 16 },
    forgotLink: { textAlign: "right", marginTop: -10, marginBottom: 16, fontSize: 12, color: "#c9a84c", cursor: "pointer" },
  };

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else onLogin();
    setLoading(false);
  };

  const handleSignup = async () => {
    setLoading(true);
    setError(null);
    if (!username || !displayName) {
      setError("Please fill in all fields.");
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, display_name: displayName } }
    });
    if (error) setError(error.message);
    else setMessage("Account created! Check your email to confirm your account, then log in.");
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    setLoading(true);
    setError(null);
    if (!email) {
      setError("Please enter your email address first.");
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) setError(error.message);
    else setMessage("Password reset email sent! Check your inbox.");
    setLoading(false);
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError(null);
    setMessage(null);
  };

  return (
    <div style={s.wrap}>
      <div style={s.logo}>🚬 Ashed</div>
      <div style={s.tagline}>YOUR CIGAR JOURNAL</div>
      <div style={s.card}>
        <div style={s.title}>
          {mode === "login" && "Welcome back"}
          {mode === "signup" && "Create your account"}
          {mode === "forgot" && "Reset your password"}
        </div>
        {error && <div style={s.error}>{error}</div>}
        {message && <div style={s.success}>{message}</div>}

        {mode === "signup" && (
          <>
            <label style={s.label}>Username</label>
            <input style={s.input} placeholder="Your username" value={username} onChange={e => setUsername(e.target.value)} />
            <label style={s.label}>Display Name</label>
            <input style={s.input} placeholder="What do you want users to see?" value={displayName} onChange={e => setDisplayName(e.target.value)} />

          </>
        )}

        {mode !== "forgot" && (
          <>
            <label style={s.label}>Email</label>
            <input style={s.input} placeholder="you@email.com" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </>
        )}

        {mode === "forgot" && (
          <>
            <label style={s.label}>Email</label>
            <input style={s.input} placeholder="you@email.com" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </>
        )}

        {mode === "login" && (
          <>
            <label style={s.label}>Password</label>
            <input style={s.input} placeholder="••••••••" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            <div style={s.forgotLink} onClick={() => switchMode("forgot")}>Forgot password?</div>
          </>
        )}

        {mode === "signup" && (
          <>
            <label style={s.label}>Password</label>
            <input style={s.input} placeholder="••••••••" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </>
        )}

        {loading
          ? <div style={s.btnDisabled}>Please wait...</div>
          : <button style={s.btn} onClick={
              mode === "login" ? handleLogin :
              mode === "signup" ? handleSignup :
              handleForgotPassword
            }>
              {mode === "login" && "Log In"}
              {mode === "signup" && "Create Account"}
              {mode === "forgot" && "Send Reset Email"}
            </button>
        }

        <div style={s.toggle}>
          {mode === "login" && <>Don't have an account? <span style={s.toggleLink} onClick={() => switchMode("signup")}>Sign up</span></>}
          {mode === "signup" && <>Already have an account? <span style={s.toggleLink} onClick={() => switchMode("login")}>Log in</span></>}
          {mode === "forgot" && <><span style={s.toggleLink} onClick={() => switchMode("login")}>← Back to login</span></>}
        </div>
      </div>
    </div>
  );
}