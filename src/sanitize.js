// Input sanitization utilities
// Strips HTML tags and trims whitespace to prevent XSS

export const sanitize = (value, maxLength = 500) => {
  if (!value || typeof value !== "string") return value;
  return value
    .replace(/<[^>]*>/g, "") // strip HTML tags
    .replace(/[<>]/g, "")    // strip any remaining angle brackets
    .trim()
    .slice(0, maxLength);
};

export const sanitizeShort = (value) => sanitize(value, 100);  // names, usernames, vitolas
export const sanitizeMedium = (value) => sanitize(value, 300); // locations, titles
export const sanitizeLong = (value) => sanitize(value, 1000);  // notes, descriptions, announcements