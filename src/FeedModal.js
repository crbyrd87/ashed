import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";
import { checkAndAwardBadges } from "./badgeEngine";

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export default function FeedModal({ checkin, user, onClose, onFireToggle }) {
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentInput, setCommentInput] = useState("");
  const [posting, setPosting] = useState(false);
  const [fired, setFired] = useState(false);
  const [fireCount, setFireCount] = useState(0);
  const [firingInProgress, setFiringInProgress] = useState(false);
  const inputRef = useRef(null);

  const isOwnCheckin = checkin.user_id === user.id;

  useEffect(() => {
    if (!checkin) return;
    loadComments();
    loadFireState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkin.id]);

  const loadComments = async () => {
    setCommentsLoading(true);
    const { data } = await supabase
      .from("comments")
      .select("*, users(username, display_name)")
      .eq("checkin_id", checkin.id)
      .order("created_at", { ascending: true });
    setComments(data || []);
    setCommentsLoading(false);
  };

  const loadFireState = async () => {
    const { count } = await supabase
      .from("fires")
      .select("*", { count: "exact", head: true })
      .eq("checkin_id", checkin.id);
    setFireCount(count || 0);

    if (!isOwnCheckin) {
      const { data } = await supabase
        .from("fires")
        .select("id")
        .eq("checkin_id", checkin.id)
        .eq("user_id", user.id)
        .maybeSingle();
      setFired(!!data);
    }
  };

  const handleFireToggle = async () => {
    if (isOwnCheckin || firingInProgress) return;
    setFiringInProgress(true);
    if (fired) {
      await supabase.from("fires").delete().eq("checkin_id", checkin.id).eq("user_id", user.id);
      setFired(false);
      setFireCount(c => Math.max(0, c - 1));
    } else {
      await supabase.from("fires").insert({ checkin_id: checkin.id, user_id: user.id });
      setFired(true);
      setFireCount(c => c + 1);
    }
    setFiringInProgress(false);
    if (onFireToggle) onFireToggle(checkin.id);
  };

  const handlePostComment = async () => {
    const body = commentInput.trim();
    if (!body || posting) return;
    setPosting(true);
    const { data, error } = await supabase
      .from("comments")
      .insert({ checkin_id: checkin.id, user_id: user.id, content: body })
      .select("*, users(username, display_name)")
      .single();
    if (!error && data) {
      setComments(prev => [...prev, data]);
      setCommentInput("");
      checkAndAwardBadges(user.id, "comment").catch(() => {});
    }
    setPosting(false);
  };

  const cigarName = checkin.cigars?.line || checkin.cigar_name || "Unknown Cigar";
  const cigarBrand = checkin.cigars?.brand || checkin.cigar_brand || "";
  const vitola = checkin.cigars?.vitola || checkin.cigar_vitola || "";
  const smokerHandle = checkin.users?.username ? `@${checkin.users.username}` : "";
  const smokeDate = checkin.smoke_date
    ? new Date(checkin.smoke_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "";

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 400, display: "flex", alignItems: "flex-end", maxWidth: 420, margin: "0 auto" }}
      onClick={onClose}
    >
      <div
        style={{ background: "#1a0f08", borderRadius: "16px 16px 0 0", border: "1px solid #3a2510", borderBottom: "none", width: "100%", maxHeight: "80vh", display: "flex", flexDirection: "column", fontFamily: SANS }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{ padding: "12px 0 0", display: "flex", justifyContent: "center" }}>
          <div style={{ width: 36, height: 4, background: "#3a2510", borderRadius: 2 }} />
        </div>

        {/* Check-in header */}
        <div style={{ padding: "12px 18px 14px", borderBottom: "1px solid #3a2510" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1, marginRight: 12 }}>
              <div style={{ fontSize: 10, color: "#8a7055", letterSpacing: 1 }}>{cigarBrand.toUpperCase()}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#e8d5b7", margin: "3px 0 4px" }}>{cigarName}{vitola ? ` · ${vitola}` : ""}</div>
              <div style={{ fontSize: 11, color: "#8a7055" }}>
                {smokerHandle && <span style={{ color: "#c9a84c" }}>{smokerHandle}</span>}
                {smokerHandle && " · "}
                {checkin.rating && <span style={{ color: "#c9a84c", fontWeight: 700 }}>{checkin.rating}</span>}
                {checkin.rating && " · "}
                {smokeDate}
              </div>
              {checkin.smoke_location && (
                <div style={{ fontSize: 11, color: "#5a4535", marginTop: 3 }}>📍 {checkin.smoke_location}</div>
              )}
              {checkin.notes && (
                <div style={{ fontSize: 12, color: "#c8b89a", fontStyle: "italic", marginTop: 8, lineHeight: 1.5 }}>"{checkin.notes}"</div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
              <button
                onClick={handleFireToggle}
                disabled={isOwnCheckin}
                style={{
                  background: fired ? "#e8632a18" : "none",
                  border: `1px solid ${fired ? "#e8632a66" : "#3a2510"}`,
                  borderRadius: 20,
                  padding: "5px 12px",
                  color: fired ? "#e8632a" : isOwnCheckin ? "#3a2510" : "#8a7055",
                  fontSize: 13,
                  cursor: isOwnCheckin ? "default" : "pointer",
                  fontFamily: SANS,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  whiteSpace: "nowrap",
                }}
              >
                🔥 {fireCount}
              </button>
            </div>
          </div>
        </div>

        {/* Comments list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 18px 0" }}>
          <div style={{ fontSize: 10, color: "#8a7055", letterSpacing: 1, marginBottom: 10 }}>
            COMMENTS {comments.length > 0 ? `(${comments.length})` : ""}
          </div>
          {commentsLoading && (
            <div style={{ fontSize: 12, color: "#5a4535", textAlign: "center", padding: "16px 0" }}>Loading...</div>
          )}
          {!commentsLoading && comments.length === 0 && (
            <div style={{ fontSize: 13, color: "#5a4535", textAlign: "center", padding: "20px 0" }}>No comments yet. Be the first!</div>
          )}
          {comments.map(c => {
            const handle = c.users?.username ? `@${c.users.username}` : "Unknown";
            const name = c.users?.display_name || c.users?.username || "Unknown";
            const isMe = c.user_id === user.id;
            return (
              <div key={c.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: isMe ? "linear-gradient(135deg,#c9a84c,#7a4a20)" : "linear-gradient(135deg,#3a5a3a,#1a2a1a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: isMe ? "#1a0f08" : "#7a9a7a", fontWeight: 700, flexShrink: 0 }}>
                    {(name[0] || "?").toUpperCase()}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: isMe ? "#c9a84c" : "#e8d5b7" }}>{handle}</span>
                  <span style={{ fontSize: 9, color: "#5a4535", marginLeft: "auto" }}>
                    {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "#c8b89a", lineHeight: 1.5, paddingLeft: 28 }}>{c.content}</div>
              </div>
            );
          })}
          <div style={{ height: 8 }} />
        </div>

        {/* Comment input */}
        <div style={{ padding: "10px 18px 20px", borderTop: "1px solid #3a2510", display: "flex", gap: 8 }}>
          <input
            ref={inputRef}
            value={commentInput}
            onChange={e => setCommentInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handlePostComment()}
            placeholder="Add a comment..."
            style={{ flex: 1, background: "#2a1a0e", border: "1px solid #3a2510", borderRadius: 20, padding: "8px 14px", color: "#e8d5b7", fontSize: 13, fontFamily: SANS, outline: "none" }}
          />
          <button
            onClick={handlePostComment}
            disabled={!commentInput.trim() || posting}
            style={{ background: commentInput.trim() ? "linear-gradient(135deg,#c9a84c,#a07830)" : "#2a1a0e", border: "none", borderRadius: 20, padding: "8px 16px", color: commentInput.trim() ? "#1a0f08" : "#5a4535", fontSize: 13, fontWeight: 700, cursor: commentInput.trim() ? "pointer" : "default", fontFamily: SANS, transition: "all 0.15s" }}
          >
            {posting ? "..." : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}