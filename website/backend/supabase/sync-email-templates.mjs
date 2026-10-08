// Updates only signup/recovery email content; preserves SMTP, providers and Auth hooks.
// SUPABASE_ACCESS_TOKEN must be a Supabase management token, never a browser key.
import {readFile} from 'node:fs/promises';

const project = 'ddhqammspwmmrprpolfw';
const templates = {
  mailer_subjects_confirmation: 'Verify your UIC email for Kampuscape',
  mailer_templates_confirmation_content: await readFile(new URL('./templates/confirmation.html', import.meta.url), 'utf8'),
  mailer_subjects_recovery: 'Reset your Kampuscape password',
  mailer_templates_recovery_content: await readFile(new URL('./templates/recovery.html', import.meta.url), 'utf8'),
};

if (process.argv.includes('--check')) {
  for (const kind of ['confirmation', 'recovery']) {
    const html = templates[`mailer_templates_${kind}_content`];
    if (html.includes('{{ .Token }}') || !html.includes('{{ .RedirectTo }}?token_hash={{ .TokenHash }}')) {
      throw new Error(`${kind} must contain an app verification link, not a numeric code.`);
    }
  }
  console.log('Signup and recovery templates contain app links; no remote changes made.');
} else {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error('Set SUPABASE_ACCESS_TOKEN to apply the templates, or use --check for local validation.');
  const endpoint = `https://api.supabase.com/v1/projects/${project}/config/auth`;
  const headers = {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'};
  const updated = await fetch(endpoint, {method: 'PATCH', headers, body: JSON.stringify(templates)});
  if (!updated.ok) throw new Error(`Template update failed (HTTP ${updated.status}).`);
  const readback = await fetch(endpoint, {headers});
  if (!readback.ok) throw new Error(`Template verification failed (HTTP ${readback.status}).`);
  const config = await readback.json();
  if (Object.entries(templates).some(([key, value]) => config[key] !== value)) {
    throw new Error('Remote templates did not match after saving. Check the Supabase email dashboard.');
  }
  console.log(`Signup and recovery link templates saved and verified for ${project}.`);
}
