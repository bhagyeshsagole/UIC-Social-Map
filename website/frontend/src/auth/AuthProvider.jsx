import React, {createContext, useCallback, useContext, useEffect, useRef, useState} from 'react';
import {supabase} from './supabase.js';
import {isEligibleUser, isUicEmail, validateProfile} from './profile.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
const fields = 'id,display_name,pronouns,avatar_id,interests,onboarding_completed_at';

export function AuthProvider({children, client = supabase}) {
  const [session, setSession] = useState(undefined), [user, setUser] = useState(null), [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(!!client), [error, setError] = useState(''), [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false), [retry, setRetry] = useState(0), [notice, setNotice] = useState('');
  const generation = useRef(0), currentUser = useRef(null);
  useEffect(() => {
    if (!client) return;
    let active = true;
    const callback = new URL(window.location.href);
    const hashParams = new URLSearchParams(callback.hash.slice(1));
    if(callback.searchParams.has('error') || hashParams.has('error')) {
      setError('Sign-in was cancelled or could not be completed. Use a verified @uic.edu account and try again.'); setOpen(true);
    }
    // Keep this callback synchronous: Supabase auth callbacks hold an auth lock.
    const {data:{subscription}} = client.auth.onAuthStateChange((_event, next) => {
      if (active) setSession(next);
    });
    client.auth.getSession().then(({data, error}) => {
      if (!active) return;
      if (error) {setError('Your session could not be restored. Please sign in again.'); setLoading(false);}
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
  // create=false is "I already have an account": never creates one by accident.
  const sendCode = async (email, create = true) => {
    if (!client) throw new Error('Sign-in is being set up. Please try again soon.');
    const address = email.trim().toLowerCase();
    if (!isUicEmail(address)) throw new Error('Use your @uic.edu email address.');
    rememberEvent();
    const {error} = await client.auth.signInWithOtp({email:address, options:{shouldCreateUser:create, emailRedirectTo:window.location.origin + window.location.pathname}});
    if (error?.code === 'otp_disabled' || (!create && error?.status === 422)) {
      const missing = new Error('No Kampuscape account uses this email yet. Create one instead.'); missing.noAccount = true; throw missing;
    }
    if (error) throw new Error(error.status === 429 ? 'Please wait a minute before requesting another email.' : 'We couldn’t send your sign-in email. Please try again.');
  };
  const verifyCode = async (email, token) => {
    if (!client || !isUicEmail(email)) throw new Error('Use your @uic.edu email address.');
    if (!/^\d{6,8}$/.test(token.trim())) throw new Error('Enter the code from your email.');
    const {error} = await client.auth.verifyOtp({email:email.trim().toLowerCase(), token:token.trim(), type:'email'});
    if (error) throw new Error('That code is invalid or expired. Try again or request a new code.');
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
    ++generation.current; currentUser.current=null; setSession(null);setUser(null);setProfile(null);setOpen(false);setEditing(false);setError('');
  };
  // Erases the account server-side (profile, support messages, Auth user), then
  // this device's per-user saved places and private plans.
  const deleteAccount = async () => {
    if (!client || !user) throw new Error('Please sign in first.');
    const id = user.id;
    const {error} = await client.rpc('kampuscape_delete_account');
    if (error) throw new Error('Your account couldn’t be deleted. Nothing was removed; please try again.');
    try {
      for (const key of [`kampuscape-saved:${id}`, `kampuscape-drafts:${id}`]) localStorage.removeItem(key);
      sessionStorage.removeItem('kampuscape-auth-return');
    } catch {}
    await client.auth.signOut({scope:'local'}).catch(() => {});
    ++generation.current; currentUser.current=null; setSession(null);setUser(null);setProfile(null);setEditing(false);setError('');
    setNotice('Your account and all of its data have been permanently erased.'); setOpen(true);
  };
  const openProfile = useCallback(() => {setOpen(true);setEditing(false);}, []);
  return <AuthContext.Provider value={{configured:!!client,user,profile,loading,error,open,editing,setEditing,openProfile,
    close:()=>{if(!user || profile?.onboarding_completed_at){setOpen(false);setNotice('');}},
    retry:()=>setRetry(v=>v+1),sendCode,verifyCode,signInGoogle,saveProfile,signOut,deleteAccount,notice,clearNotice:()=>setNotice('')}}>{children}</AuthContext.Provider>;
}
