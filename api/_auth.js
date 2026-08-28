// Shared server-side auth for the /api routes.
//
// Files prefixed with an underscore are not exposed as routes by Vercel, so
// this is a helper module rather than an endpoint.
//
// CR-5/CR-6: the endpoints used to take the caller's identity from the request
// body — any client could claim to be any user, which made the premium gate and
// the per-user rate limits advisory rather than enforced. Identity now comes
// only from a Supabase access token that this server verifies.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Service-role client. Bypasses RLS, so it must never be handed a value that
// came from the request without being verified first.
export const adminClient = () => createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const bearer = (req) => {
  const header = req.headers.authorization || req.headers.Authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
};

// Returns the verified user id, or null. Never falls back to a body field:
// a caller with no valid token is anonymous, whatever they claim to be.
export const verifiedUserId = async (req) => {
  const token = bearer(req);
  if (!token) return null;
  try {
    const { data, error } = await adminClient().auth.getUser(token);
    if (error || !data?.user?.id) return null;
    return data.user.id;
  } catch (e) {
    console.error("[auth] token verification failed:", e.message);
    return null;
  }
};

// CR-7: the cron endpoint has no user. Vercel Cron sends the project's
// CRON_SECRET as a bearer token, so compare against that.
export const isCronRequest = (req) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const token = bearer(req);
  return !!token && token === secret;
};
