import { initializeApp } from 'firebase/app'
import { getAuth, OAuthProvider } from 'firebase/auth'

// linexAcademy lives in the shared `linexrewards-app` Firebase project (see
// docs/org-context.md) — this config is not secret, it's the standard
// public web config Firebase issues per app.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'linexrewards-app.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'linexrewards-app',
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
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
