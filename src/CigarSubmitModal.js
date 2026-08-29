import { useState } from "react";
import { SANS, color, type } from "./theme";
import { Sheet } from "./ui";
import { authedFetch } from "./apiClient";
import { supabase } from "./supabase";
import { sanitizeShort } from "./sanitize";

const STRENGTHS = ["Mild", "Mild-Medium", "Medium", "Medium-Full", "Full"];

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
      const verifyRes = await authedFetch("/api/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 100,
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
    <Sheet align="center" zIndex={800} maxWidth={380} dismissOnScrim={false}>
        <div style={{ fontSize: 16, fontWeight: 700, color: color.heading, marginBottom: 4 }}>Can't Find Your Cigar?</div>
        <div style={{ fontSize: type.xs, color: color.dim, marginBottom: 20, lineHeight: 1.5 }}>
          Submit it and you can log it right away. Our team will review and verify it.
        </div>

        {[
          { label: "BRAND", field: "brand", placeholder: "e.g. Rocky Patel" },
          { label: "LINE", field: "line", placeholder: "e.g. Vintage 1990" },
          { label: "VITOLA", field: "vitola", placeholder: "e.g. Robusto, Toro, Churchill" },
        ].map(({ label, field, placeholder }) => (
          <div key={field} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: type.xs, color: color.dim, letterSpacing: 1, marginBottom: 4 }}>{label}</div>
            <input
              value={form[field]}
              onChange={e => set(field, e.target.value)}
              placeholder={placeholder}
              style={{ width: "100%", background: color.surface, border: `1px solid ${color.lineStrong}`, borderRadius: 8, padding: "10px 12px", color: color.heading, fontSize: type.md, fontFamily: SANS, outline: "none", boxSizing: "border-box" }}
            />
          </div>
        ))}

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: type.xs, color: color.dim, letterSpacing: 1, marginBottom: 4 }}>STRENGTH (optional)</div>
          <select value={form.strength} onChange={e => set("strength", e.target.value)}
            style={{ width: "100%", background: color.surface, border: `1px solid ${color.lineStrong}`, borderRadius: 8, padding: "10px 12px", color: form.strength ? color.heading : color.faint, fontSize: type.md, fontFamily: SANS, outline: "none", boxSizing: "border-box" }}>
            <option value="">Select strength...</option>
            {STRENGTHS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {error && (
          <div style={{ background: `${color.danger}22`, border: `1px solid ${color.danger}55`, borderRadius: 8, padding: "10px 12px", marginBottom: 12, fontSize: type.xs, color: color.dangerText, lineHeight: 1.5 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleSubmit} disabled={verifying}
            style={{ flex: 2, background: verifying ? color.surfaceRaised : `linear-gradient(135deg, ${color.goldLegacy}, ${color.goldDeep})`, border: "none", borderRadius: 10, padding: 13, color: verifying ? color.faint : color.bg, fontSize: 14, fontWeight: 700, cursor: verifying ? "default" : "pointer", fontFamily: SANS }}>
            {verifying ? "Verifying..." : "Submit Cigar"}
          </button>
          <button onClick={onClose}
            style={{ flex: 1, background: "none", border: `1px solid ${color.lineStrong}`, borderRadius: 10, padding: 13, color: color.dim, fontSize: 13, cursor: "pointer", fontFamily: SANS }}>
            Cancel
          </button>
        </div>

        <div style={{ fontSize: type.xs, color: color.faint, marginTop: 12, textAlign: "center" }}>
          You can log this cigar right away while we verify it.
        </div>
    </Sheet>
  );
}