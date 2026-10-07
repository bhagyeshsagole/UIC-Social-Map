import {INTEREST_IDS} from '../interests.js';
export const AVATARS = [
  {id:'orbit', label:'Orbit', symbol:'🪐', color:'#ded9fa'},
  {id:'sprout', label:'Sprout', symbol:'🌱', color:'#dcebd7'},
  {id:'sun', label:'Sunshine', symbol:'☀️', color:'#f7e6b6'},
  {id:'cat', label:'Cat', symbol:'🐱', color:'#f4dac9'},
  {id:'fox', label:'Fox', symbol:'🦊', color:'#f3d2b8'},
  {id:'wave', label:'Wave', symbol:'🌊', color:'#d3e8f5'},
  {id:'berry', label:'Berry', symbol:'🍓', color:'#f2d6df'},
  {id:'ghost', label:'Friendly ghost', symbol:'👻', color:'#e2e2ee'},
];
export const PRONOUNS = ['', 'she/her', 'he/him', 'they/them', 'she/they', 'he/they', 'any pronouns'];
export function isUicEmail(email) {
  return typeof email === 'string' && /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@uic\.edu$/i.test(email.trim());
}
export function isEligibleUser(user) {
  return !!user?.id && isUicEmail(user.email) && !!user.email_confirmed_at && !user.is_anonymous;
}
export function validateProfile(input) {
  const display_name = String(input.display_name || '').trim();
  const pronouns = String(input.pronouns || '').trim();
  const interests = [...new Set(Array.isArray(input.interests) ? input.interests : [])];
  if (display_name.length < 2 || display_name.length > 60) throw new Error('Use a name between 2 and 60 characters.');
  if (pronouns.length > 40) throw new Error('Keep pronouns under 40 characters.');
  if (!AVATARS.some(a => a.id === input.avatar_id)) throw new Error('Choose an avatar.');
  if (interests.length < 1 || interests.length > 8 || interests.some(id => !INTEREST_IDS.includes(id))) throw new Error('Choose 1–8 interests.');
  return {display_name, pronouns, avatar_id:input.avatar_id, interests};
}
