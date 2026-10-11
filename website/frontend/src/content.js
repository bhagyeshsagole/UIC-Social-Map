// added_sites.md ends with a generated log of the nearby directory; only the hand-edited places above it are parsed.
export const DIRECTORY_START = '<!-- nearby-directory:start -->', DIRECTORY_END = '<!-- nearby-directory:end -->';
export function parsePlaces(markdown) {
  const records = [...markdown.split(DIRECTORY_START)[0].matchAll(/<!-- id: ([a-z0-9-]+) -->\s*\n## ([^\n]+)\n([\s\S]*?)(?=\n<!-- id:|$)/g)].map(([, id, name, description]) => ({ id, name: name.trim(), description: description.trim() }));
  if (!records.length || new Set(records.map(p => p.id)).size !== records.length) throw new Error('added_sites.md needs unique place IDs, headings, and descriptions.');
  return records;
}
