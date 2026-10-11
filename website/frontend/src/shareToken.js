// Some messaging apps glue the share text onto the link ("…/share/<token> Title · Hosted by…").
// The token is always the leading UUID, so read that and ignore whatever follows.
export function tokenFrom(raw) {
  let value = String(raw ?? '');
  try {value = decodeURIComponent(value);} catch {}
  return value.trim().match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?![0-9a-f])/i)?.[0].toLowerCase() || null;
}
