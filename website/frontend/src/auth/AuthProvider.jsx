import React, {createContext, useCallback, useContext, useEffect, useRef, useState} from 'react';
import {fetchAuthProviders, supabase} from './supabase.js';
import {isEligibleUser, isUicEmail, validateProfile} from './profile.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
const fields = 'id,display_name,pronouns,avatar_id,interests,onboarding_completed_at';
export const PASSWORD_MIN = 8;

export function AuthProvider({children, client = supabase, providers = fetchAuthProviders}) {
  const [session, setSession] = useState(undefined), [user, setUser] = useState(null), [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(!!client), [error, setError] = useState(''), [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false), [retry, setRetry] = useState(0), [notice, setNotice] = useState('');
  const [recovering, setRecovering] = useState(false), [changingPassword, setChangingPassword] = useState(false);
  // The Google button appears only once Google is enabled in Supabase.
  const [googleEnabled, setGoogleEnabled] = useState(false);
  useEffect(() => {if (client) providers().then(p => setGoogleEnabled(!!p.google));}, [client, providers]);
  const generation = useRef(0), currentUser = useRef(null);
  useEffect(() => {
    if (!client) return;
    let active = true;
    const callback = new URL(window.location.href);
    const hashParams = new URLSearchParams(callback.hash.slice(1));
    const linkError = callback.searchParams.get('error_code') || hashParams.get('error_code');
    if(linkError === 'otp_expired') {
      setError('That email link has expired or was already used. Sign in, or request a new link.'); setOpen(true);
    } else if(callback.searchParams.has('error') || hashParams.has('error')) {
      setError('Sign-in was cancelled or could not be completed. Use a verified @uic.edu account and try again.'); setOpen(true);
    }
    // A verification link opened in a different browser verifies the email but can't
    // sign in there (no PKCE verifier); say so instead of showing a session error.
    const verifyCallback = callback.searchParams.has('code');
    // Email buttons link to kampuscape.com itself (?token_hash=…&type=…), so the link
    // domain matches the sender and works in any browser or device.
    const tokenHash = callback.searchParams.get('token_hash'), linkType = callback.searchParams.get('type');
    // Keep this callback synchronous: Supabase auth callbacks hold an auth lock.
    const {data:{subscription}} = client.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY') {setRecovering(true); setOpen(true);}
      setSession(next);
    });
    if (tokenHash && ['email', 'recovery'].includes(linkType)) {
      callback.searchParams.delete('token_hash'); callback.searchParams.delete('type');
      window.history.replaceState(null, '', callback.pathname + callback.search + callback.hash);
      setOpen(true);
      // Subscribe before verifying so the new session and recovery event cannot be missed.
      // Do not race getSession() against this request and overwrite its new session.
      client.auth.verifyOtp({token_hash:tokenHash, type:linkType}).then(({data, error:linkFailure}) => {
        if (!active) return;
        if (linkFailure || !data?.session) {
          setError(linkType === 'recovery' ? 'That reset link has expired or was already used. Request a new one with Forgot password.' : 'That verification link has expired or was already used. Try signing in; if your email isn’t verified yet, you can resend the link.');
          setLoading(false);
        } else {
          if (linkType === 'recovery') setRecovering(true);
          setSession(data.session);
        }
      }).catch(() => {
        if (active) {setError('We couldn’t verify your email link. Reopen it to try again, or request a new one.'); setLoading(false);}
      });
    } else client.auth.getSession().then(({data, error}) => {
      if (!active) return;
      if (verifyCallback && !data?.session) {
        setNotice('Your email link was opened in another browser. If you just verified your email, you’re all set: sign in with your email and password.'); setOpen(true);
      } else if (error) {setError('Your session could not be restored. Please sign in again.'); setLoading(false);}
      setSession(data?.session || null);
      if (!data?.session) setLoading(false);
    }).catch(() => {if(active){setError('Sign-in is temporarily unavailable. Please try again.');setLoading(false);}});
    return () => {active = false; subscription.unsubscribe();};
  }, [client]);

  useEffect(() => {
    const version = ++generation.current;
    if(client && session === undefined)return;
    if (!client || !session) {
      currentUser.current = null; setUser(null); setProfile(null); setLoading(false); return;
    }
    let active = true;
    setLoading(currentUser.current !== session.user.id); setError('');
    if (currentUser.current !== session.user.id) {setUser(null); setProfile(null);}
    (async () => {
      // Fetch the authoritative Auth user, never trust editable user_metadata.
      const {data, error:authError} = await client.auth.getUser();
      if (!active || version !== generation.current) return;
      if (authError) throw new Error('Your session could not be verified. Please sign in again.');
      if (!isEligibleUser(data.user)) {
        await client.auth.signOut({scope:'local'});
        if (active) {setError('Sign in with a verified @uic.edu account. Other email domains cannot join Kampuscape.'); setOpen(true);}
        return;
      }
      currentUser.current = data.user.id; setUser(data.user);
      const {data:row, error:profileError} = await client.from('kampuscape_profiles').select(fields).eq('id', data.user.id).maybeSingle();
      if (!active || version !== generation.current) return;
      if (profileError) throw new Error('We couldn’t load your profile. Please retry.');
      setProfile(row); setOpen(previous => row?.onboarding_completed_at ? previous : true);
    })().catch(e => {if(active && version === generation.current) {setError(e.message || 'Connection interrupted. Please retry.'); setOpen(true);}})
      .finally(() => {if(active && version === generation.current) setLoading(false);});
    return () => {active = false;};
  }, [client, session, retry]);

  const rememberEvent = () => {try {if(window.location.hash.startsWith('#event='))sessionStorage.setItem('kampuscape-auth-return',window.location.hash);}catch{}};
  useEffect(() => {
    if(!profile?.onboarding_completed_at)return;
    try{const hash=sessionStorage.getItem('kampuscape-auth-return');if(hash?.startsWith('#event=')){sessionStorage.removeItem('kampuscape-auth-return');window.location.hash=hash;}}catch{}
  },[profile?.id,profile?.onboarding_completed_at]);
  // Email + password: verification email once at sign-up, then password sign-in
  // with no email. Errors carry flags so the dialog can offer the next step.
  const here = () => window.location.origin + window.location.pathname;
  const fail = (message, flags = {}) => Object.assign(new Error(message), flags);
  const account = (email, password) => {
    if (!client) throw fail('Sign-in is being set up. Please try again soon.');
    const address = email.trim().toLowerCase();
    if (!isUicEmail(address)) throw fail('Use your @uic.edu email address.');
    if (password !== undefined && password.length < PASSWORD_MIN) throw fail(`Use at least ${PASSWORD_MIN} characters for your password.`);
    return address;
  };
  const signUp = async (email, password) => {
    const address = account(email, password);
    rememberEvent();
    const {data, error} = await client.auth.signUp({email:address, password, options:{emailRedirectTo:here()}});
    if (error?.status === 429) throw fail('Too many attempts. Please wait a few minutes and try again.');
    if (error?.code === 'weak_password') throw fail('Choose a stronger password: longer, and not a common one.');
    if (error?.status === 403) throw fail('Only @uic.edu accounts can join Kampuscape.');
    if (error) throw fail('We couldn’t create your account. Please try again.');
    // Supabase hides whether an address is taken: an existing account comes back with no identities.
    if (data.user && !data.user.identities?.length) throw fail('An account already uses this email. Sign in instead.', {existing:true});
  };
  const signIn = async (email, password) => {
    const address = account(email);
    if (!password) throw fail('Enter your password.');
    rememberEvent();
    const {error} = await client.auth.signInWithPassword({email:address, password});
    if (error?.code === 'email_not_confirmed') throw fail('Verify your email first. Open the link we sent when you signed up.', {unconfirmed:true});
    if (error?.status === 429) throw fail('Too many attempts. Please wait a few minutes and try again.');
    if (error) throw fail('That email and password don’t match. Try again, or reset your password.');
  };
  const resendVerification = async email => {
    const address = account(email);
    const {error} = await client.auth.resend({type:'signup', email:address, options:{emailRedirectTo:here()}});
    if (error) throw fail(error.status === 429 ? 'Please wait a minute before requesting another email.' : 'We couldn’t resend the email. Please try again.');
  };
  const requestPasswordReset = async email => {
    const address = account(email);
    const {error} = await client.auth.resetPasswordForEmail(address, {redirectTo:here()});
    if (error?.status === 429) throw fail('Please wait a minute before requesting another email.');
    if (error) throw fail('We couldn’t send the reset email. Please try again.');
  };
  const updatePassword = async password => {
    if (!client || !user) throw fail('Please sign in first.');
    if (password.length < PASSWORD_MIN) throw fail(`Use at least ${PASSWORD_MIN} characters for your password.`);
    const {error} = await client.auth.updateUser({password});
    if (error?.code === 'same_password') throw fail('Choose a password you haven’t used here before.');
    if (error?.code === 'weak_password') throw fail('Choose a stronger password: longer, and not a common one.');
    if (error?.code === 'reauthentication_needed') throw fail('For security, sign out and sign back in (or use Forgot password), then try again.');
    if (error) throw fail('Your password couldn’t be saved. Please try again.');
    setRecovering(false); setChangingPassword(false); setNotice('Your password is saved. Next time, sign in with your email and password.');
  };
  const signInGoogle = async () => {
    if (!client) throw new Error('Sign-in is being set up. Please try again soon.');
    // Keep shared-event fragments across the OAuth round trip, without sending them to Google.
    rememberEvent();
    const {error} = await client.auth.signInWithOAuth({provider:'google', options:{
      redirectTo:window.location.origin + window.location.pathname,
      queryParams:{hd:'uic.edu', prompt:'select_account'},
    }});
    if (error) throw new Error('Google sign-in is unavailable. Try your UIC email instead.');
  };
  const saveProfile = async input => {
    if (!client || !isEligibleUser(user)) throw new Error('Please sign in with your UIC account first.');
    const clean = validateProfile(input), id = user.id, version = generation.current;
    const {data, error} = await client.from('kampuscape_profiles').upsert({id,...clean,onboarding_completed_at:new Date().toISOString()}, {onConflict:'id'}).select(fields).single();
    if (error) throw new Error('Your profile couldn’t be saved. Your choices are still here; please retry.');
    if (version !== generation.current || currentUser.current !== id) throw new Error('Your account changed. Please reopen your profile.');
    setProfile(data); setEditing(false); setOpen(false); setError('');
    try {
      const hash = sessionStorage.getItem('kampuscape-auth-return');
      if(hash?.startsWith('#event=')) {sessionStorage.removeItem('kampuscape-auth-return'); window.location.hash=hash;}
    } catch {}
  };
  const signOut = async () => {
    if (!client) return;
    const {error} = await client.auth.signOut({scope:'local'});
    if (error) throw new Error('Sign-out failed. Please retry.');
    ++generation.current; currentUser.current=null; setSession(null);setUser(null);setProfile(null);setOpen(false);setEditing(false);setError('');setRecovering(false);setChangingPassword(false);
  };
  // Erases the account server-side (profile, support messages, Auth user), then
  // this device's per-user saved places and private plans.
  const deleteAccount = async () => {
    if (!client || !user) throw new Error('Please sign in first.');
    const id = user.id;
    const {error} = await client.rpc('kampuscape_delete_account');
    if (error) throw new Error('Your account couldn’t be deleted. Nothing was removed; please try again.');
    try {
      for (const key of [`kampuscape-saved:${id}`, `kampuscape-drafts:${id}`, `kampuscape-registered-events:${id}`]) localStorage.removeItem(key);
      sessionStorage.removeItem('kampuscape-auth-return');
      sessionStorage.removeItem(`kampuscape-registration-return:${id}`);
    } catch {}
    await client.auth.signOut({scope:'local'}).catch(() => {});
    ++generation.current; currentUser.current=null; setSession(null);setUser(null);setProfile(null);setEditing(false);setError('');
    setNotice('Your account and all of its data have been permanently erased.'); setOpen(true);
  };
  const openProfile = useCallback(() => {setOpen(true);setEditing(false);}, []);
  return <AuthContext.Provider value={{configured:!!client,user,profile,loading,error,open,editing,setEditing,openProfile,
    close:()=>{if(!user || profile?.onboarding_completed_at){setOpen(false);setNotice('');setChangingPassword(false);setRecovering(false);}},
    retry:()=>setRetry(v=>v+1),signUp,signIn,resendVerification,requestPasswordReset,updatePassword,recovering,changingPassword,setChangingPassword,googleEnabled,signInGoogle,saveProfile,signOut,deleteAccount,notice,clearNotice:()=>setNotice('')}}>{children}</AuthContext.Provider>;
}
