import {db,auth} from "../firebase.js";

// Auth Helpers
export async function sha256(str){
  const buf=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(str));
  return[...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,"0")).join("");
}
export const hashPw=(user,pw)=>sha256(user.toLowerCase()+":"+pw);
export const validUsername=n=>/^[A-Za-z0-9 _-]{2,20}$/.test(n);

// Firebase Authentication: Benutzernamen werden auf technische E-Mail-Adressen abgebildet
// (z. B. "Gabi kalthoefer" -> gabi.kalthoefer@ratemates.invalid). Die Adressen existieren
// nicht, Firebase braucht sie nur als Kennung. Der Benutzername bleibt überall der Schlüssel.
// Datenbank: users/<Name>/uid, uids/<uid> = Name, names/<name klein> = Name (Eindeutigkeit).
export const authEmail=n=>n.trim().toLowerCase().replace(/ /g,".")+"@ratemates.invalid";
export const nameKey=n=>n.trim().toLowerCase();
// Echte E-Mail hinterlegt? Dann meldet sich das Konto mit dieser Adresse an und kann
// ein vergessenes Passwort per Mail zurücksetzen. Die Adresse liegt nur in Firebase Auth.
export const hasRealEmail=u=>!!(u&&u.email&&!u.email.endsWith("@ratemates.invalid"));
export const validEmail=m=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m);
export const readOnce=path=>new Promise((res,rej)=>db.ref(path).once("value",s=>res(s.val()),rej));
export const loginError=msg=>Object.assign(new Error(msg),{msg});
export const NO_ACCOUNT_CODES=["auth/user-not-found","auth/invalid-credential","auth/invalid-login-credentials","auth/wrong-password"];
export const authErrorMsg=(e,fallback)=>{
  const c=(e&&e.code)||"";
  if(c==="auth/network-request-failed")return "Verbindungsfehler. Bitte erneut versuchen.";
  if(c==="auth/too-many-requests")return "Zu viele Versuche. Bitte kurz warten.";
  if(c==="auth/operation-not-allowed"||c==="auth/configuration-not-found")return "Anmeldung per Passwort ist in Firebase nicht freigeschaltet.";
  if(c==="auth/weak-password")return "Passwort zu kurz (mindestens 6 Zeichen).";
  if(c==="auth/invalid-email")return "Das ist keine gültige E-Mail-Adresse.";
  if(c==="auth/email-already-in-use")return "Diese E-Mail-Adresse gehört schon zu einem anderen Konto.";
  if(c==="auth/requires-recent-login")return "Bitte melde dich einmal ab und wieder an.";
  return fallback;
};
// Nach erfolgreicher Firebase-Anmeldung: Verknüpfung uid <-> Benutzername sicherstellen.
// Ein altes Konto (nur pwHash, noch keine uid) wird dabei umgezogen. Die Datenbankregel
// lässt das nur zu, wenn der mitgeschickte Hash zum gespeicherten passt.
export async function completeLogin(n,pw){
  const uid=auth.currentUser.uid;
  const linked=await readOnce("users/"+n+"/uid");
  if(linked===null){
    const created=await readOnce("users/"+n+"/createdAt");
    if(created===null)throw loginError("Benutzer nicht gefunden.");
    const h=await hashPw(n,pw);
    try{await db.ref("users/"+n).update({uid,pwHash:h});}
    catch{throw loginError("Falsches Passwort.");}
  }else if(linked!==uid){
    throw loginError("Falsches Passwort. Hast du eine E-Mail-Adresse hinterlegt? Dann melde dich damit an.");
  }
  await db.ref("uids/"+uid).set(n).catch(()=>{});
  await db.ref("names/"+nameKey(n)).set(n).catch(()=>{});
  // Anzeigename für die Anrede in Firebase-Mails (%DISPLAY_NAME%)
  if(auth.currentUser.displayName!==n)await auth.currentUser.updateProfile({displayName:n}).catch(()=>{});
  await db.ref("users/"+n+"/pwHash").remove().catch(()=>{});
  await db.ref("users/"+n+"/seeded").remove().catch(()=>{});
}
