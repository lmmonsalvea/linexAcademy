import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, OAuthProvider } from 'firebase/auth'

// linexAcademy lives in the shared `linexrewards-app` Firebase project (see
// docs/org-context.md) — this config is not secret, it's the standard
// public web config Firebase issues per app.
// Firebase web "API keys" are not secrets (they only select which project's
// config loads — real access control is Firebase Auth + Firestore rules) and
// are shared by every web app registered in the same project. This is the
// project's browser key; the `linexrewards-app` project has hit its Firebase
// web-app-registration quota, so linexAcademy reuses the shared key/appId
// instead of getting its own "app" entry — that's a cosmetic grouping in the
// Firebase console (mostly for Analytics), not a security boundary.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBICqc49j3O1jlBmnEZT-0Ux2PZNbaJV2c',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'linexrewards-app.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'linexrewards-app',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:145860740642:web:6a09a7123909735e80ec7b',
}

export const firebaseApp = initializeApp(firebaseConfig)
export const auth = getAuth(firebaseApp)

// Microsoft/Entra ID is already configured as a native provider in
// linexrewards-app — nothing to create in Azure, see
// .claude/skills/connect-entra-id-firebase-auth/SKILL.md
export const microsoftProvider = new OAuthProvider('microsoft.com')
microsoftProvider.setCustomParameters({
  // Ultragroup tenant (docs/org-context.md) — restricts sign-in to accounts
  // in that tenant instead of any Microsoft work/school account.
  tenant: import.meta.env.VITE_ENTRA_TENANT_ID || 'e4f9385c-add2-4a84-9c23-9353fc6059da',
  // Mandatory, not cosmetic: without it the popup silently reuses whatever
  // Microsoft identity is already cached in the browser.
  prompt: 'select_account',
})
microsoftProvider.addScope('email')

// Google is also already enabled as a native provider in linexrewards-app
// (confirmed alongside Microsoft — same project, no separate setup needed).
// Matches the pattern used by other Linex apps on this project (athena,
// marlo): offer both, no client-side domain restriction on the Google
// provider itself — the backend's email-domain allowlist
// (backend/src/middleware/auth.js) is what actually gates access, the same
// way regardless of which provider was used to sign in.
export const googleProvider = new GoogleAuthProvider()
