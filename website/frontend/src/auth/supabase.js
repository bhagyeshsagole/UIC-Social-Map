import {createClient} from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
// Which sign-in providers the project has switched on (e.g. Google), from Auth's public settings.
export const fetchAuthProviders = () => url && key
  ? fetch(`${url}/auth/v1/settings`, {headers:{apikey:key}}).then(r => r.ok ? r.json() : {}).then(s => s.external || {}).catch(() => ({}))
  : Promise.resolve({});
export const supabase = url && key ? createClient(url, key, {auth:{
  flowType:'pkce', detectSessionInUrl:true, persistSession:true, autoRefreshToken:true,
  storageKey:'kampuscape-auth',
}}) : null;
