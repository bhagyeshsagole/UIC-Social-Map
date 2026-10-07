export const STORAGE_KEYS = {
  saved: 'kampuscape-saved',
  drafts: 'kampuscape-drafts',
};

// Read the previous brand's data until the app persists the Kampuscape keys.
const LEGACY_KEYS = {
  [STORAGE_KEYS.saved]: 'afterclass-saved',
  [STORAGE_KEYS.drafts]: 'afterclass-drafts',
};

export function readStore(key, fallback, storage) {
  try {
    const store = storage ?? globalThis.localStorage;
    for (const candidate of [key, LEGACY_KEYS[key]].filter(Boolean)) {
      try {
        const value = JSON.parse(store.getItem(candidate));
        if (Array.isArray(value)) return value;
      } catch {
        // A corrupt entry should not prevent recovery from the legacy key.
      }
    }
  } catch {
    // Device storage may be unavailable; the app still works for this session.
  }
  return fallback;
}
