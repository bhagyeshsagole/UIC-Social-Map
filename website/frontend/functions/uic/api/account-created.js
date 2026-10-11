import {isEligibleUser} from '../../../src/auth/profile.js';

const reply = (status, body) => Response.json(body, {status, headers:{'Cache-Control':'no-store'}});
const MAX_AGE = 10 * 60 * 1000;

// Auth validates the token and supplies the recipient. Resend's idempotency window
// is 24 hours; limiting this endpoint to ten minutes prevents later repeat sends.
export async function sendAccountCreated({request, env}, fetcher = fetch, now = Date.now()) {
  const authorization = request.headers.get('Authorization');
  if (!/^Bearer \S+$/.test(authorization || '')) return reply(401, {error:'Sign in first.'});
  const key = env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!key || !env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) return reply(503, {error:'Welcome email is not configured.'});
  try {
    const auth = await fetcher('https://ddhqammspwmmrprpolfw.supabase.co/auth/v1/user', {
      headers:{apikey:key, Authorization:authorization}, signal:AbortSignal.timeout(10000),
    });
    if (!auth.ok) return reply(401, {error:'Sign in again.'});
    const user = await auth.json(), age = now - Date.parse(user.created_at);
    if (!isEligibleUser(user) || !Number.isFinite(age) || age < 0 || age > MAX_AGE) {
      return reply(403, {error:'Welcome emails are only available for newly created UIC accounts.'});
    }
    const delivery = await fetcher('https://api.resend.com/emails', {
      method:'POST', signal:AbortSignal.timeout(10000),
      headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`, 'Content-Type':'application/json', 'Idempotency-Key':`account-created/${user.id}`},
      body:JSON.stringify({from:`Kampuscape <${env.RESEND_FROM_EMAIL}>`, to:[user.email],
        subject:'Your Kampuscape account is created',
        text:'Welcome to Kampuscape! Your account is created and ready to use. Sign in with your UIC email and password at https://kampuscape.com/uic.\n\nForgot your password? Choose Forgot password on the sign-in screen to get a reset link.\n\nIf you didn’t create this account, contact https://kampuscape.com/support.',
        html:'<!doctype html><html lang="en"><body style="margin:0;padding:32px 16px;background:#f3f3ee;font-family:Arial,sans-serif;color:#28352f"><div style="max-width:480px;margin:auto;padding:32px;background:#fff;border-radius:20px"><p style="font-size:19px;font-weight:700">Kampuscape</p><h1 style="font-size:24px">Your account is created.</h1><p style="line-height:1.6">Welcome! Your Kampuscape account is ready to use. Sign in with your UIC email and password.</p><p><a href="https://kampuscape.com/uic" style="display:inline-block;padding:14px 24px;background:#405f39;color:#fff;text-decoration:none;border-radius:12px">Explore Kampuscape</a></p><p style="line-height:1.6">Forgot your password? Choose Forgot password on the sign-in screen to get a reset link.</p><p style="font-size:13px;line-height:1.6">If you didn’t create this account, <a href="https://kampuscape.com/support">contact support</a>.</p></div></body></html>',
      }),
    });
    if (!delivery.ok) return reply(502, {error:'Welcome email could not be sent.'});
    return reply(200, {sent:true});
  } catch {
    // Never return provider response bodies or credentials to the browser.
    return reply(503, {error:'Welcome email is temporarily unavailable.'});
  }
}

export const onRequestPost = context => sendAccountCreated(context);
