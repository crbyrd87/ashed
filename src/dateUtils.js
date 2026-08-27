// Date handling for smoke_date.
//
// checkins.smoke_date is a date-only Postgres column, so it arrives as the
// bare string "2026-08-27". Passing that to `new Date()` invokes the ISO
// date-only branch of the spec, which parses it as midnight **UTC**. Rendering
// that with toLocaleDateString then converts it into the viewer's zone, and
// for anyone west of UTC midnight UTC is still the previous evening — so every
// date displayed one day early. Storage was always correct; only reading and
// seeding were wrong.
//
// Everything that reads or writes a smoke_date should go through this file
// rather than calling `new Date()` on the raw string.

// Parse a date-only string as a LOCAL date, never UTC.
// Returns null for empty or malformed input so callers can guard, rather than
// an Invalid Date that silently poisons arithmetic downstream.
export const parseLocalDate = (value) => {
  if (!value) return null;
  const [y, m, d] = String(value).split("T")[0].split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

// Today in the user's OWN timezone as "YYYY-MM-DD", the format an
// <input type="date"> expects.
//
// The obvious version, new Date().toISOString().split("T")[0], gives the UTC
// date. Between 8pm and midnight US Eastern that is already tomorrow, so a
// check-in logged during the evening — prime smoking hours — saved with
// tomorrow's date.
export const todayLocalISO = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

// The one display format for a smoke date: "Aug 27, 2026".
export const formatSmokeDate = (value) => {
  const d = parseLocalDate(value);
  return d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
};

// The date a check-in belongs to, for grouping and counting.
// Falls back to created_at, which is a full timestamp and so is already
// correct through the normal Date constructor — it must NOT be parsed as a
// date-only string.
export const checkinDate = (checkin) => {
  if (!checkin) return null;
  if (checkin.smoke_date) return parseLocalDate(checkin.smoke_date);
  return checkin.created_at ? new Date(checkin.created_at) : null;
};
