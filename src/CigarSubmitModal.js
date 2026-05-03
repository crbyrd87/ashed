import { useState } from "react";
import { supabase } from "./supabase";
import { sanitizeShort } from "./sanitize";

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const STRENGTHS = ["Light", "Medium", "Medium-Full", "Full"];

export default function CigarSubmitModal({ user, onClose, onSubmitted }) {
  const [form, setForm] = useState({ brand: "", line: "", vitola: "", strength: "" });
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);

  const set = (field, val) => setForm(p => ({ ...p, [field]: val }));

  const handleSubmit = async () => {
    if (!form.brand.trim() || !form.line.trim() || !form.vitola.trim()) {
      setError("Brand, line, and vitola are required.");
      return;
    }
    setVerifying(true);
    setError(null);

    try {
      // Quick Haiku verification — is this a real cigar?
      const verifyRes = await fetch("/api/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 100,
          user_id: user?.id,
          feature: "tasting_notes", // reuse tasting notes rate limit bucket
          messages: [{
            role: "user",
            content: `Is "${form.brand} ${form.line} ${form.vitola}" a real premium cigar that exists or plausibly could exist? Reply with only "yes" or "no".`
          }]
        })
      });
      const verifyData = await verifyRes.json();
      const verdict = verifyData.content?.[0]?.text?.toLowerCase().trim() || "no";

      if (!verdict.includes("yes")) {
        setError("We couldn't verify this as a real cigar. Please double-check the brand, line, and vitola name.");
        setVerifying(false);
        return;
      }

      // Check if it already exists
      const { data: existing } = await supabase
        .from("cigars")
        .select("id, brand, line, vitola, verified, rejection_reason")
        .eq("brand", sanitizeShort(form.brand.trim()))
        .eq("line", sanitizeShort(form.line.trim()))
        .eq("vitola", sanitizeShort(form.vitola.trim()))
        .maybeSingle();

      if (existing) {
        if (existing.verified) {
          onSubmitted(existing);
          onClose();
          return;
        }
        // Already submitted, return the existing record
        onSubmitted(existing);
        onClose();
        return;
      }

      // Insert as user_submitted
      const { data: inserted, error: insertErr } = await supabase
        .from("cigars")
        .insert({
          brand: sanitizeShort(form.brand.trim()),
          line: sanitizeShort(form.line.trim()),
          vitola: sanitizeShort(form.vitola.trim()),
          strength: form.strength || null,
          source: "user_submitted",
          verified: false,
          submitted_by: user?.id || null,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;
      onSubmitted(inserted);
      onClose();
    } catch (e) {
      console.error("Submit error:", e);
      setError("Something went wrong. Please try again.");
    }
    setVerifying(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: SANS }}>
      <div style={{ background: "#1a0f08", border: "1px solid #4a3520", borderRadius: 16, padding: 24, maxWidth: 380, width: "100%" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#f5ead8", marginBottom: 4 }}>Can't Find Your Cigar?</div>
        <div style={{ fontSize: 12, color: "#7a6048", marginBottom: 20, lineHeight: 1.5 }}>
          Submit it and you can log it right away. Our team will review and verify it.
        </div>

        {[
          { label: "BRAND", field: "brand", placeholder: "e.g. Rocky Patel" },
          { label: "LINE", field: "line", placeholder: "e.g. Vintage 1990" },
          { label: "VITOLA", field: "vitola", placeholder: "e.g. Robusto, Toro, Churchill" },
        ].map(({ label, field, placeholder }) => (
          <div key={field} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: "#7a6048", letterSpacing: 1, marginBottom: 4 }}>{label}</div>
            <input
              value={form[field]}
              onChange={e => set(field, e.target.value)}
              placeholder={placeholder}
              style={{ width: "100%", background: "#221508", border: "1px solid #4a3520", borderRadius: 8, padding: "10px 12px", color: "#f5ead8", fontSize: 13, fontFamily: SANS, outline: "none", boxSizing: "border-box" }}
            />
          </div>
        ))}

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: "#7a6048", letterSpacing: 1, marginBottom: 4 }}>STRENGTH (optional)</div>
          <select value={form.strength} onChange={e => set("strength", e.target.value)}
            style={{ width: "100%", background: "#221508", border: "1px solid #4a3520", borderRadius: 8, padding: "10px 12px", color: form.strength ? "#f5ead8" : "#5a4535", fontSize: 13, fontFamily: SANS, outline: "none", boxSizing: "border-box" }}>
            <option value="">Select strength...</option>
            {STRENGTHS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {error && (
          <div style={{ background: "#a0522d22", border: "1px solid #a0522d55", borderRadius: 8, padding: "10px 12px", marginBottom: 12, fontSize: 12, color: "#e8a07a", lineHeight: 1.5 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleSubmit} disabled={verifying}
            style={{ flex: 2, background: verifying ? "#2a1a0e" : "linear-gradient(135deg, #d4b45a, #a07830)", border: "none", borderRadius: 10, padding: 13, color: verifying ? "#5a4535" : "#1a0f08", fontSize: 14, fontWeight: 700, cursor: verifying ? "default" : "pointer", fontFamily: SANS }}>
            {verifying ? "Verifying..." : "Submit Cigar"}
          </button>
          <button onClick={onClose}
            style={{ flex: 1, background: "none", border: "1px solid #4a3520", borderRadius: 10, padding: 13, color: "#7a6048", fontSize: 13, cursor: "pointer", fontFamily: SANS }}>
            Cancel
          </button>
        </div>

        <div style={{ fontSize: 11, color: "#5a4535", marginTop: 12, textAlign: "center" }}>
          You can log this cigar right away while we verify it.
        </div>
      </div>
    </div>
  );
}