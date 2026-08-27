---
name: connect-entra-id-firebase-auth
description: Connects Microsoft Entra ID (Azure AD / Office 365) as a login provider (OIDC/SAML) in Firebase Authentication for any Firebase project we manage -- not tied to a specific repo/app. Use when the user asks to "connect Entra ID to Firebase Auth", "add Microsoft/Office 365 SSO to Firebase", "custom providers in Firebase Auth", or asks about OpenID Connect/SAML in the Authentication console.
---

# connect-entra-id-firebase-auth

How to connect a client's Entra ID (Azure AD) as a login provider in
Firebase Authentication, using the "Custom providers" section
(OpenID Connect / SAML). Applies to **any** Firebase project, not one in
particular.

## One is already set up for `linexrewards-app` -- reuse it, don't create another

If your app lives in the Firebase project **`linexrewards-app`** (see
`docs/org-context.md`), **the Microsoft provider is already enabled in that
project** with a shared App Registration in the Ultragroup tenant
(`e4f9385c-add2-4a84-9c23-9353fc6059da`). There's no need to create a new App
Registration or request a new Client Secret -- go straight to section
**"Implementation in a new app inside `linexrewards-app`"** below.
The Phase 1/Phase 2 steps in this document are for when the Firebase project
or the Entra ID tenant are different (a new client/project that doesn't
share the existing Firebase project).

## OIDC vs SAML vs native Microsoft: which to choose

**If the IdP is literally Microsoft/Entra ID, use Firebase's native
"Microsoft" provider (`microsoft.com`), not custom OIDC.** It's
simpler to set up (Firebase already knows how to talk to Microsoft's
endpoints, it only asks for Client ID + Client Secret) and the client
code is just as simple (`new OAuthProvider('microsoft.com')`).

Custom OIDC (`oidc.*`) only makes sense if the IdP is **not**
Microsoft (Okta, Auth0, Keycloak, etc.) or if you need to target a tenant/
issuer that the native provider doesn't let you configure. SAML only if the
client already has a specific SAML Enterprise Application they must reuse,
or if their IT policy explicitly requires SAML -- in practice, "I need
federated permissions/groups" is **not** a reason for SAML: that's solved
with Entra ID App Roles over OIDC (or the native provider), the same
mechanism works the same way.

**Confirmed gotcha:** even the **native** Microsoft provider triggers the
upgrade to Identity Platform in Firebase (at least in `linexrewards-app`) --
it's not exclusive to custom OIDC/SAML providers as originally thought.
Check the cost estimate before confirming the upgrade (see next section).

## Mandatory prerequisite: Identity Platform (GCIP)

The "Custom providers" section only works if the Firebase project has
**Identity Platform** enabled -- it's an upgrade over the free "classic"
Firebase Auth, with its own per-MAU pricing on custom providers. It's
activated once per project from the banner in
Authentication > Sign-in method. Without this, saving the provider fails
silently or the section appears disabled.

**Before enabling it on a project with real users**, check the current
Identity Platform pricing -- it can have a per-MAU cost that classic
Firebase Auth doesn't have.

## Information to gather before starting

| # | Data | Notes |
|---|---|---|
| 1 | Exact Firebase Project ID | The real one, not the folder/repo name -- see `.firebaserc` |
| 2 | Client's Entra ID Tenant ID | Each client/brand has its own tenant -- don't assume it's the same as another already-connected project |
| 3 | Redirect domain(s) | `<project-id>.firebaseapp.com` always; + custom domain if the project has one mapped |
| 4 | OIDC or SAML | See previous section |
| 5 | Who administers the Entra ID tenant | Needs Application Administrator permissions to create the App Registration |
| 6 | Test users | To validate login before exposing it to everyone |

## Flow architecture (OIDC)

```
User -> App (signInWithPopup/Redirect with OAuthProvider('oidc.<id>'))
     -> Entra ID login (login.microsoftonline.com/<tenant>/v2.0)
     -> redirect to https://<project-id>.firebaseapp.com/__/auth/handler
     -> Firebase exchanges the code for tokens (Authorization Code flow)
     -> Firebase issues its own ID token; Entra claims are available
        via providerData / the original id_token if requested
```

## Phase 1 -- App Registration in Entra ID (Azure side)

Entra ID / az CLI gotchas that always apply, regardless of use case:
- Entra ID issues **v1.0 tokens by default** -- you must force
  `requestedAccessTokenVersion: 2` via Graph API, or the token issuer won't
  match `https://login.microsoftonline.com/<tenant>/v2.0`.
- `az ad app-role assignment add` and `az ad app permission admin-consent` are
  **deprecated** in modern az CLI -- use `az rest` against Microsoft Graph, and
  grant admin consent manually in the Portal.

**What's different for Firebase (vs. a generic OIDC client):**

| | Generic client (SPA/PKCE) | Firebase Auth |
|---|---|---|
| Client type | Public, no secret | **Confidential** -- needs a Client Secret |
| Redirect URI | `spa` type | `web` type, single one: `https://<project-id>.firebaseapp.com/__/auth/handler` |
| Own App Roles / scopes | Depends on the case | Not needed -- just `openid profile email` |

## Phase 2 -- Register the provider in Firebase (GCP side)

Two ways to do it:

1. **Console** (simpler for a one-off): Firebase Console > Authentication >
   Sign-in method > Add new provider > OpenID Connect. Provide the Issuer, Client ID,
   and Client Secret from the App Registration created in Phase 1.
2. **Identity Toolkit API** (automatable): `POST https://identitytoolkit.googleapis.com/v2/projects/<PROJECT_ID>/oauthIdpConfigs?oauthIdpConfigId=oidc.<id>`
   with `clientId`, `issuer`, `clientSecret`, `responseType: {code: true}`
   (Authorization Code flow, recommended since we have a client secret).

The `providerId` in Firebase **must** start with `oidc.` (or `saml.`) -- that's
how Firebase distinguishes a custom provider from a native one (`google.com`, `password`, etc.)

## Implementation in a new app inside `linexrewards-app`

For any new app that wants the same login (same Firebase project,
same Ultragroup tenant) -- **nothing to create on Azure, the App Registration
already exists and is shared.** Just 3 steps:

### 1. Add your domain to Firebase Auth (the step almost always forgotten)

`Firebase Console > linexrewards-app > Authentication > Settings >
Authorized domains > Add domain`. Add the **exact** hostname your
app is served from (no `https://`, no `/`, **no wildcards** -- Firebase
doesn't support `*.domain.com`, each subdomain must be added one by one,
including the auto-generated App Hosting domain like
`<backend>--linexrewards-app.<region>.hosted.app` if you also test from
there).

Without this step, login fails with **`auth/unauthorized-domain`** as soon as
`signInWithPopup`/`signInWithRedirect` is called -- it doesn't even reach
Microsoft, Firebase blocks it first.

### 2. Client code

```ts
import { getAuth, OAuthProvider } from "firebase/auth";

const auth = getAuth(app); // same firebaseConfig as linexrewards-app
const microsoftProvider = new OAuthProvider('microsoft.com');
// 'organizations' accepts any work/school account (excludes personal
// @outlook.com/@hotmail.com accounts); use Ultragroup's specific tenant ID
// (`e4f9385c-add2-4a84-9c23-9353fc6059da`) to restrict to that tenant only.
microsoftProvider.setCustomParameters({ tenant: 'organizations', prompt: 'select_account' });
microsoftProvider.addScope('email');
```

**`prompt: 'select_account'` is mandatory, not cosmetic.** Without it, the popup
silently reuses whatever Microsoft identity is already cached in the
browser/device -- on a shared machine or with a previous session from another
account, login "works" but against the wrong account, with no way to
choose. The same problem exists with `GoogleAuthProvider` and is fixed the same way.

### 3. Your app needs ITS OWN authorization layer -- this is what almost always breaks

**A successful Microsoft login only proves identity, not permission.**
Firebase Auth doesn't know or care whether that person should have access to
YOUR particular app -- each app decides that on its own. Recommended pattern:

1. The client sends the Firebase `idToken` to your own endpoint (`/api/auth/verify`)
2. The endpoint verifies the token (`adminAuth.verifyIdToken`)
3. It looks up the email in a Firestore collection (`users`) -- if it's not
   there, checks a domain allowlist (e.g. `AUTO_PROVISION_DOMAINS`) to
   auto-approve known domains (`@linextravel.com`, `@linex-loyalty.com`,
   `@ultragroupla.com`, see `docs/org-context.md`), or denies
4. Stores the role as a **custom claim** (`setCustomUserClaims`) so
   Firestore Security Rules can use it directly, not just the client

If another app "isn't logging in" after steps 1-2, it's almost
always this step 3 that's missing -- login DID work (Firebase already
has the user authenticated), but the app has no rule deciding
whether that user is allowed in. The typical symptom is an app-specific
message like "account not enabled", **not** a Firebase/Microsoft error.

## Expected gotchas (to confirm the first time this runs)

| Problem | Likely cause | Fix |
|---|---|---|
| `auth/unauthorized-domain` when calling signIn | The domain the app is served from isn't in Firebase Auth's Authorized domains | Add it under Authentication > Settings > Authorized domains -- exact, no wildcard |
| Login succeeds but the app says "account not enabled" / similar | Confusing authentication (Firebase) with authorization (your app) -- different layers | Check the app's own authorization layer (see implementation step 3) -- not an Entra ID/Firebase problem |
| Firebase asks for an Identity Platform upgrade even with the native Microsoft provider | Confirmed in `linexrewards-app`: not exclusive to custom OIDC/SAML | Check the cost estimate (new per-MAU pricing) before confirming -- not optional, you have to go through it anyway |
| The popup reuses a different Microsoft account than expected | Missing `prompt: 'select_account'` in `setCustomParameters` | Always add it together with `tenant` |
| `redirect_uri_mismatch` on login | The redirect URI registered in Entra ID doesn't match exactly (includes or is missing a custom domain) | Register ALL domains the login is served from (`firebaseapp.com` + custom domain) |
| Token rejected / issuer mismatch | App Registration still issuing v1.0 tokens | Force `requestedAccessTokenVersion: 2` (see Phase 1) |
| Login works and then stops working with no code changes | Client Secret expired (rotation not configured) | Set a reminder before the secret's expiration; rotate via `az ad app credential reset` + PATCH the provider in Firebase |
| An account from a "sibling" domain can't log in | Assuming they're different tenants when they actually share one | Verify with `az rest --method GET --uri "https://graph.microsoft.com/v1.0/domains"` -- if both domains show `Verified: true` in the same response, they already share a tenant |

## Gotcha already found

The real Firebase Project ID for the Ultragroup tenant is **`linexrewards-app`**
(Entra ID tenant: `e4f9385c-add2-4a84-9c23-9353fc6059da`). Confirmed that
`ultragroupla.com`, `linextravel.com`, and `linex-loyalty.com` are verified
domains of the **same tenant** (not separate tenants) -- any account
from any of these domains signs in with the shared App Registration, with no
extra per-domain configuration.

But **authorization** (who can USE each app, not just authenticate)
is each app's own responsibility and is NOT solved by adding a
domain anywhere in Entra ID/Firebase -- see implementation step 3
above. Each app keeps its own list of allowed domains/emails, and
that's where it must be updated, not in Azure or the Firebase console.
