// Calls to our own /api routes.
//
// The endpoints verify a Supabase access token and derive the user from it,
// so every request has to carry one. Sending user_id in the body no longer
// identifies anybody — the server ignores it.

import { supabase } from "./supabase";

export const authedFetch = async (url, options = {}) => {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
};
