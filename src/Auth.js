import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { font, color, type, weight, radius, TRACK_LABEL } from "./theme";
import { Button, Icon, Notice, Pressable, SectionLabel } from "./ui";

// The splash and the login form, both served from here and switched on the
// path. These are the only two pages a stranger sees.
//
// The gate is deliberately soft: `pathname === "/login"` means the real product
// is one URL guess away from public, and the marketing copy cannot be edited
// without touching auth. That is fine while the audience is people who were
// given the URL; before a real launch it wants an env flag and a route.

const WHATS_COMING = [
  { Glyph: Icon.Feed,      text: "A journal with ratings and notes" },
  { Glyph: Icon.Scan,      text: "Scan a band to identify a cigar" },
  { Glyph: Icon.Recommend, text: "Recommendations from your palate" },
  { Glyph: Icon.Drink,     text: "Drink pairings, both directions" },
  { Glyph: Icon.Friends,   text: "A feed of what friends are smoking" },
  { Glyph: Icon.Venue,     text: "Shops and lounges near you" },
];

function Wordmark({ size }) {
  return (
    <div style={{ textAlign: "center" }}>
      <img
        src="/ashed-icon-192.png"
        alt=""
        width={size}
        height={size}
        style={{ borderRadius: radius.md, display: "block", margin: "0 auto 16px" }}
      />
      <div style={{
        fontFamily: font.display, fontSize: type.xxl, fontWeight: weight.displayMed,
        letterSpacing: "0.1em", color: color.textPrimary, lineHeight: 1.1,
      }}>
        Ashed
      </div>
      <div style={{
        fontSize: type.xs, color: color.textMuted,
        letterSpacing: "0.18em", textTransform: "uppercase", marginTop: 8,
      }}>
        Cigar concierge and community
      </div>
    </div>
  );
}

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [referredBy, setReferredBy] = useState(null); // username of referrer

  useEffect(() => {
    // Read ?ref=username from URL and persist to localStorage
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      localStorage.setItem("ashed_referral", ref);
      setReferredBy(ref);
      setMode("signup");
    } else {
      const stored = localStorage.getItem("ashed_referral");
      if (stored) setReferredBy(stored);
    }
  }, []);

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

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, display_name: displayName } }
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Supabase deliberately reports success when the address already has an
    // account, so this form cannot be used to discover which emails are
    // registered. That means `error` is null and nothing was created. The tell
    // is an empty identities array.
    //
    // Without this check the app tells a returning user to watch for a
    // confirmation email that was never sent, and if they later try their old
    // password they are simply let in — which reads as the app being broken.
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setError("An account with that email already exists. Try logging in, or use Forgot password if you don't remember it.")
      setLoading(false);
      return;
    }

    // Store referral username for processing after email confirmation
    // The actual referral record is created in App.js on first login
    if (referredBy) {
      localStorage.setItem("ashed_referral", referredBy);
    }

    setMessage("Account created! Check your email to confirm your account, then log in.");
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
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) setError(error.message);
    else setMessage("Password reset email sent! Check your inbox.");
    setLoading(false);
  };

  const showApp = window.location.pathname === "/login";

  const switchMode = (newMode) => {
    setMode(newMode);
    setError(null);
    setMessage(null);
  };

  const wrap = {
    minHeight: "100vh",
    background: color.bg,
    fontFamily: font.sans,
    color: color.textBody,
    maxWidth: 420,
    margin: "0 auto",
    padding: "48px 20px calc(40px + env(safe-area-inset-bottom))",
  };

  const label = {
    fontSize: type.xs, color: color.textFaint,
    letterSpacing: TRACK_LABEL, textTransform: "uppercase",
    display: "block", marginBottom: 6,
  };

  // Inputs sit ABOVE the card, not below it: the card used to be lighter than
  // the fields inside it, which inverted the depth. 17px so iOS Safari does not
  // zoom the page on focus — on the very first screen of the app.
  const input = {
    width: "100%", height: 52, boxSizing: "border-box",
    background: color.surfaceRaised,
    border: `1px solid ${color.borderStrong}`,
    borderRadius: radius.md,
    padding: "0 14px",
    color: color.textPrimary,
    fontSize: type.md,
    fontFamily: font.sans,
    outline: "none",
    marginBottom: 16,
  };

  if (!showApp) {
    return (
      <div style={wrap}>
        <Wordmark size={68} />

        {/* Lead with what it is. The page used to open on "Coming Soon" — the
            absence — and only then explain the thing that was absent. */}
        <div style={{ marginTop: 40, marginBottom: 40 }}>
          <div style={{
            fontFamily: font.display, fontSize: type.xl, fontWeight: weight.displayLight,
            color: color.textPrimary, lineHeight: 1.25, textWrap: "balance",
          }}>
            A record of every cigar worth remembering.
          </div>
          <div style={{ fontSize: type.md, color: color.textMuted, lineHeight: 1.6, marginTop: 14 }}>
            Log what you smoke, rate it, and keep the notes you'd otherwise
            forget. Coming to iOS and Android.
          </div>
        </div>

        <SectionLabel rule style={{ marginBottom: 4 }}>What's coming</SectionLabel>
        {WHATS_COMING.map(({ Glyph, text }) => (
          <div key={text} style={{
            display: "flex", alignItems: "center", gap: 14,
            minHeight: 54, borderBottom: `1px solid ${color.border}`,
          }}>
            <span style={{ flexShrink: 0, display: "flex" }}><Glyph size={19} color={color.textMuted} /></span>
            <span style={{ fontSize: type.md, color: color.textBody }}>{text}</span>
          </div>
        ))}

        <div style={{ marginTop: 40, textAlign: "center", fontSize: type.sm, color: color.textFaint }}>
          Ashed · 2026
        </div>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <Wordmark size={52} />

      <div style={{
        marginTop: 36,
        background: color.surface,
        border: `1px solid ${color.border}`,
        borderRadius: radius.lg,
        padding: 26,
      }}>
        <div style={{
          fontFamily: font.display, fontSize: type.lg, fontWeight: weight.displayMed,
          color: color.textPrimary, marginBottom: 20,
        }}>
          {mode === "login" && "Welcome back"}
          {mode === "signup" && "Create your account"}
          {mode === "forgot" && "Reset your password"}
        </div>

        {mode === "signup" && referredBy && (
          <Notice style={{ marginBottom: 16 }}>
            Invited by <strong style={{ color: color.textPrimary }}>@{referredBy}</strong> — welcome to Ashed.
          </Notice>
        )}

        {error && <Notice isError text={error} style={{ marginBottom: 16 }} />}
        {message && <Notice text={message} style={{ marginBottom: 16 }} />}

        {mode === "signup" && (
          <>
            <label style={label}>Username</label>
            <input style={input} placeholder="Your username" value={username} onChange={e => setUsername(e.target.value)} />
            <label style={label}>Display name</label>
            <input style={input} placeholder="What do you want users to see?" value={displayName} onChange={e => setDisplayName(e.target.value)} />
          </>
        )}

        <label style={label}>Email</label>
        <input style={input} placeholder="you@email.com" type="email" value={email} onChange={e => setEmail(e.target.value)} />

        {mode !== "forgot" && (
          <>
            <label style={label}>Password</label>
            <input style={input} placeholder="••••••••" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </>
        )}

        {mode === "login" && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -8, marginBottom: 8 }}>
            <Pressable onClick={() => switchMode("forgot")} minHeight={44}
              style={{ display: "flex", alignItems: "center", color: color.gold, fontSize: type.sm }}>
              Forgot password?
            </Pressable>
          </div>
        )}

        {/* A spinner inside the button, rather than a styled div rendered in
            its place: a disabled-looking div reads as a dead control. */}
        <Button
          disabled={loading}
          onClick={
            mode === "login" ? handleLogin :
            mode === "signup" ? handleSignup :
            handleForgotPassword
          }
        >
          {loading ? <Spinner /> : (
            <>
              {mode === "login" && "Log in"}
              {mode === "signup" && "Create account"}
              {mode === "forgot" && "Send reset email"}
            </>
          )}
        </Button>

        <div style={{ marginTop: 20, textAlign: "center", fontSize: type.sm, color: color.textMuted }}>
          {mode === "login" && (
            <>Don't have an account? <Link onClick={() => switchMode("signup")}>Sign up</Link></>
          )}
          {mode === "signup" && (
            <>Already have an account? <Link onClick={() => switchMode("login")}>Log in</Link></>
          )}
          {mode === "forgot" && (
            <Link onClick={() => switchMode("login")}>
              <Icon.Back size={15} color={color.gold} /> Back to login
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function Link({ onClick, children }) {
  return (
    <Pressable onClick={onClick} minHeight={0}
      style={{ display: "inline-flex", alignItems: "center", gap: 4, color: color.gold, fontSize: type.sm }}>
      {children}
    </Pressable>
  );
}

const SPIN = "ashed-spin";
if (typeof document !== "undefined" && !document.getElementById(SPIN)) {
  const el = document.createElement("style");
  el.id = SPIN;
  el.textContent = `@keyframes ${SPIN}{to{transform:rotate(360deg)}}`;
  document.head.appendChild(el);
}

function Spinner() {
  return (
    <span
      aria-label="Working"
      style={{
        width: 18, height: 18, borderRadius: "50%",
        border: `2px solid ${color.bg}44`,
        borderTopColor: color.bg,
        animation: `${SPIN} 0.7s linear infinite`,
        display: "inline-block",
      }}
    />
  );
}
