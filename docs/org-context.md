# Organization context

Concrete facts about how our organization is set up in GitHub/GCP/Firebase/Entra ID — so we don't have to rediscover them project by project. If any of this changes (a new project is created, an org policy moves), update this file — don't let it go stale.

## GitHub

- **Org:** `github.com/Linex-Loyalty`
- **Repo naming convention:** see [naming-conventions.md](naming-conventions.md) — summary: `{product}[-{layer}]`, kebab-case, without repeating "linex"/"loyalty" (the org already gives that).
- **Branch protection:** if your project is going to deploy automatically from `main` (App Hosting or your own pipeline), set up branch protection with required PR + reviewers on that branch — it's the only real gate for "who approves a production deploy" (see section 6 of the `create-firebase-project` skill).

## GCP / Firebase

- **GCP organization:** `linexrewards.com` (Customer ID `C034ba75s`).
- **Main shared project:** `linexrewards-app` — the real Project ID (**don't** confuse it with folder/repo names like `mint-loyalty`, `leyda-revenue-os`; always check `.firebaserc`). It hosts, among others: `mint-loyalty` (Firestore in a named database `mint-loyalty`, not default), `leyda-revenue-os`, `app1-loyalty`.
- **Before requesting a new GCP/Firebase project**, ask yourself whether your app can live inside `linexrewards-app` (another named Firestore database, another App Hosting backend) — usually yes, unless you need real cost/security isolation from the rest. See `create-firebase-project`.
- **Shared chat/agents backend:** `agents-gateway` (Cloud Run, repo `linex-agents-gateway`) — if your app needs an LLM chat/agent, you probably reuse this instead of standing up a new one.

### GCP org policies already set (verified, not assumed)

These restrictions apply to **every** project under the `linexrewards.com` organization — if something you try to do collides with one of these, it's not a bug, it's an intentional policy:

| Constraint | Status | What it means for a builder |
|---|---|---|
| `iam.disableServiceAccountKeyCreation` | **Enforced** | You cannot create **JSON keys** for service accounts (`gcloud iam service-accounts keys create`). If you need something external (CI/CD, a local script) to act as an SA, use **Workload Identity Federation** or Application Default Credentials — not a downloaded key file. |
| `iam.disableServiceAccountKeyUpload` | **Enforced** | You also can't upload a public key to associate with an SA. Same spirit as the previous one. |
| `iam.automaticIamGrantsForDefaultServiceAccounts` | **Enforced** | A new project's default service accounts (`xxx-compute@developer.gserviceaccount.com`, etc.) **do not** automatically get the Editor role on creation — you must explicitly grant what they need. Safer, but it means a new project can fail from missing permissions where it "just worked" before. |
| `storage.uniformBucketLevelAccess` | **Enforced** | Every new Cloud Storage bucket uses uniform access control (IAM), not per-object ACLs. Don't try to use `gsutil acl` on a new bucket. |
| `iam.allowedPolicyMemberDomains` | Unrestricted (`ALLOW` all) | There's no domain restriction for adding IAM members — but that doesn't mean you should add any email; follow `manage-team-permissions` to decide the right role. |
| `essentialcontacts.allowedContactDomains` | Restricted to `@linexrewards.com` | "Essential Contacts" (GCP billing/security notifications) only accept emails from that domain — don't use your personal work email here even if you have permissions. |

**Why this matters for "what permissions to request":** if someone asks you to create a service account key for a script, the right answer isn't "ask for whatever role" — it's that this operation is intentionally blocked at the organization level, and the real solution is something else (Workload Identity Federation, or a Secret Manager secret with Application Default Credentials). Don't try to solve it by escalating permissions — it won't work.

## Microsoft Entra ID (Azure AD / Office 365)

- **Ultragroup tenant:** `e4f9385c-add2-4a84-9c23-9353fc6059da`.
- **Verified domains in that same tenant** (confirmed, not separate tenants): `ultragroupla.com`, `linextravel.com`, `linex-loyalty.com`. Any account from these domains signs in with the same shared App Registration.
- **A Microsoft provider is already enabled in `linexrewards-app`** — if your app lives in that project, you don't need to create a new App Registration. See the `connect-entra-id-firebase-auth` skill, section "One is already set up for `linexrewards-app`".

## What to reuse vs. what to create new (quick rule)

| I need... | Reuse what exists | Create something new |
|---|---|---|
| Corporate login (Microsoft SSO) in `linexrewards-app` | ✅ App Registration + provider already configured | Only if it's a different client's Entra ID tenant |
| LLM chat/agent | ✅ `agents-gateway` (Cloud Run) | Only if you need a very different model/architecture |
| Database for your app inside `linexrewards-app` | ✅ New named Firestore database in the existing project | A separate GCP/Firebase project only if you need real cost/security isolation |
| Backend in another language (Python, .NET, Go...) | — | New Cloud Run (see `choose-deploy-platform`) |
