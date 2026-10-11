// Targeted settings update: leaves providers, hooks, redirects and other templates alone.
import {readFile} from 'node:fs/promises';
const project = 'ddhqammspwmmrprpolfw';
const recovery = await readFile(new URL('./templates/recovery.html',import.meta.url),'utf8');
if (recovery.includes('{{ .Token }}') || !recovery.includes('{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=recovery')) {
  throw new Error('Recovery must use the app reset link, not a numeric code.');
}
const settings = {
  mailer_autoconfirm:true,
  mailer_subjects_recovery:'Reset your Kampuscape password',
  mailer_templates_recovery_content:recovery,
};
if (process.argv.includes('--check')) {
  console.log('Immediate signup and recovery-link settings validated locally; no remote changes made.');
} else {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error('Supply SUPABASE_ACCESS_TOKEN securely, or use --check for local validation.');
  const endpoint = `https://api.supabase.com/v1/projects/${project}/config/auth`;
  const headers = {Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
  const readConfig = async () => {
    const response = await fetch(endpoint,{headers,signal:AbortSignal.timeout(15000)});
    if (!response.ok) throw new Error(`Auth configuration read failed (HTTP ${response.status}).`);
    return response.json();
  };
  const current = await readConfig();
  if (process.env.RESEND_API_KEY) {
    if (!/^[^\s<>@]+@kampuscape\.com$/.test(process.env.RESEND_FROM_EMAIL || '')) {
      throw new Error('Set RESEND_FROM_EMAIL to a sender at the verified kampuscape.com domain.');
    }
    Object.assign(settings,{smtp_host:'smtp.resend.com',smtp_port:'465',smtp_user:'resend',
      smtp_pass:process.env.RESEND_API_KEY,smtp_admin_email:process.env.RESEND_FROM_EMAIL,smtp_sender_name:'Kampuscape'});
  } else if (current.smtp_host !== 'smtp.resend.com' || current.smtp_user !== 'resend' || !current.smtp_admin_email) {
    throw new Error('Configure Resend SMTP first, or supply RESEND_API_KEY and RESEND_FROM_EMAIL securely.');
  }
  const saved = await fetch(endpoint,{method:'PATCH',headers,body:JSON.stringify(settings),signal:AbortSignal.timeout(15000)});
  if (!saved.ok) throw new Error(`Auth update failed (HTTP ${saved.status}).`);
  const result = await readConfig();
  // Providers may redact passwords; verify all other fields without printing configuration.
  if (Object.entries(settings).some(([key,value])=>key !== 'smtp_pass' && result[key] !== value)) {
    throw new Error('Auth settings did not match after saving. Check the Supabase dashboard.');
  }
  console.log('Immediate signup, recovery links and Resend SMTP settings saved and verified.');
}
