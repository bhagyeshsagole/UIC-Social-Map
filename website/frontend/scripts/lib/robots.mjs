// Standard robots.txt matching: the group naming KampuscapeBot (else "*"), wildcards and "$", longest rule wins.
export function robotsAllow(text, path) {
  const groups = []; let current = null, lastWasAgent = false;
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim(), colon = line.indexOf(':');
    if (colon < 0) continue;
    const field = line.slice(0, colon).trim().toLowerCase(), value = line.slice(colon + 1).trim();
    if (field === 'user-agent') {if (!lastWasAgent) groups.push(current = {agents: [], rules: []}); current.agents.push(value.toLowerCase()); lastWasAgent = true;}
    else {lastWasAgent = false; if (current && (field === 'allow' || field === 'disallow') && value) current.rules.push({allow: field === 'allow', value});}
  }
  const group = groups.find(g => g.agents.some(a => a.includes('kampuscape'))) || groups.find(g => g.agents.includes('*'));
  let best = null;
  for (const rule of group?.rules || []) {
    const pattern = rule.value.replace(/[.+?^{}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\$(?!$)/g, '\\$');
    if (new RegExp(`^${pattern}`).test(path) && (!best || rule.value.length > best.value.length || (rule.value.length === best.value.length && rule.allow))) best = rule;
  }
  return !best || best.allow;
}
