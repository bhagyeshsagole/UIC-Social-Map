export function parsePlaces(markdown) {
  const records = [...markdown.matchAll(/<!-- id: ([a-z0-9-]+) -->\s*\n## ([^\n]+)\n([\s\S]*?)(?=\n<!-- id:|$)/g)].map(([, id, name, description]) => ({ id, name: name.trim(), description: description.trim() }));
  if (!records.length || new Set(records.map(p => p.id)).size !== records.length) throw new Error('added_sites.md needs unique place IDs, headings, and descriptions.');
  return records;
}
