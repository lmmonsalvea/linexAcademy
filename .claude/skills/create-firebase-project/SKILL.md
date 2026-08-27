---
name: create-firebase-project
description: How to create or confirm a Firebase project and its App Hosting backend -- via CLI (gcloud/firebase) or the portal -- and what IAM permissions you'll need along the way, in the right order. Use when the user asks to "create a Firebase project", "set up App Hosting", "connect my repo to Firebase", or gets a permissions error running "firebase apphosting:backends:create".
---

# create-firebase-project

How to stand up the Firebase App Hosting project/backend for a new app, without repeating the detours we already ran into with half-granted permissions.

## Before anything: new project or reuse an existing one?

**Don't assume you need a new GCP/Firebase project.** Check `docs/org-context.md` — most apps in the ecosystem live together in the shared `linexrewards-app` project, each with its own named Firestore database and its own App Hosting backend. A separate project only makes sense if you need real cost/security isolation, or it's for a completely different client/tenant.

## Option A — Via CLI (recommended, repeatable, and what this playbook uses)

### 1. Create or confirm the project

```bash
firebase projects:create <project-id>       # only if it's a new project
firebase projects:list                       # to confirm the real Project ID if reusing an existing one
```

**Write down the real Project ID** — not the repo folder's name. Always verify it in `.firebaserc`, never in the terminal prompt (a gotcha we've already hit several times: `mint-loyalty` is just the folder name, the real Project ID is `linexrewards-app`).

### 2. Enable App Hosting and create the backend

```bash
firebase init apphosting   # if the repo doesn't have an apphosting.yaml yet
firebase apphosting:backends:create --project=<project-id>
```

The CLI will ask you for:
- Region (pick the same one other apps in the same project use, unless there's a specific reason for another).
- GitHub repo to connect (needs Firebase's GitHub App installed on the repo — the CLI walks you through it if it isn't).
- Live branch (usually `main`).

### 3. The permission chain you'll need (in order of appearance)

**This is the important part:** the first time someone creates a backend in a project, the permission error appears **in layers** — you fix one and the next one shows up. It's not a bug, it's that each operation lives in a different IAM role. If you have project admin permissions, request this whole list at once instead of resolving errors one by one (see `manage-team-permissions` for the detail on each role):

1. `roles/firebase.admin` — access to Firebase products in general.
2. `roles/serviceusage.serviceUsageConsumer` — enable/use GCP APIs.
3. `roles/iam.serviceAccountUser` — act as the service account that runs the backend.
4. `roles/secretmanager.secretAccessor` — read secrets at runtime (see `manage-secrets`).
5. `roles/cloudbuild.builds.editor` — App Hosting builds with Cloud Build underneath.
6. `roles/artifactregistry.writer` — the build pushes the image to Artifact Registry.
7. `roles/iam.serviceAccountAdmin` — **only needed on the project's first backend**: the App Hosting service account (`firebase-app-hosting-compute@...`) doesn't exist yet and the CLI tries to create it.
8. `roles/resourcemanager.projectIamAdmin` — **also only the first time**: after creating that service account, the CLI grants it roles (`secretAccessor`, `datastore.user`, etc.), which requires being able to modify the project's IAM policy.

Roles 7 and 8 are sensitive (they grant the ability to create identities and modify anyone's permissions in the project) — request them with that explicit note to whoever grants them, don't assume them as "routine". Once the App Hosting service account already exists in the project, a second backend/tenant in the same project normally no longer needs them.

### 4. Verify it worked

```bash
firebase apphosting:backends:list --project=<project-id>
firebase apphosting:rollouts:list --backend=<backend-id> --project=<project-id>
```

## Option B — Via the portal (simpler for a one-off, not repeatable)

1. [console.firebase.google.com](https://console.firebase.google.com) → **Add project** (or select an existing one).
2. **Build → App Hosting** → **Get started** → connect your GitHub repo (install Firebase's GitHub App if it's the first time) → choose the live branch.
3. The same permissions from the previous section apply the same way — the portal doesn't avoid them, it just asks for them through a different interface (banners like "you need to enable X API" or "grant access to Y").

**When to use portal vs CLI:** portal for a quick exploration or if you've never used `firebase`/`gcloud`; CLI if you're going to repeat the process (several tenants, several environments) or want it to remain a reproducible command, not a click nobody remembers how it was done.

## `apphosting.yaml` — the minimum your app needs

```yaml
runConfig:
  minInstances: 0    # 0 = scales to zero, saves cost; 1+ = avoids cold starts (use in prod if latency matters)
env:
  - variable: MY_PUBLIC_VARIABLE
    value: "something-not-sensitive"
  - variable: MY_API_KEY
    secret: MY_API_KEY   # see manage-secrets to create the secret and grant access
```

Per-environment config: `apphosting.<ENVIRONMENT_NAME>.yaml` (falls back to `apphosting.yaml` if a specific one doesn't exist) — useful for `minInstances: 1` in prod vs `0` in staging.

## Environments — what does NOT exist and what does

- **There is no** automatic per-Pull-Request preview URL in App Hosting (that does exist in classic Firebase Hosting, not here). Don't promise it to a builder coming from other platforms (Vercel, Netlify) expecting that behavior.
- **What does exist**: multiple backends, each with its own live branch (e.g. one for `main` = prod, another for `develop` = staging). Google recommends going further and using a **separate Firebase project per environment** if the case justifies it.
- **The only real gate for "who approves a production deploy" is GitHub**, not Firebase: branch protection + PR reviewers on the live branch. App Hosting doesn't know what a PR is, it just reacts to whatever lands on the configured branch.

## Mistakes already made — don't repeat them

- Confusing the local folder/repo name with the real Project ID → always check `.firebaserc`.
- Assuming Firestore uses `(default)` → it may be a named database; check `firebase.json` before writing a new script with the Admin SDK.
- Editing `firestore.rules` locally and thinking it already took effect — it has no effect until `firebase deploy --only firestore:rules`.
- Requesting the `iam.serviceAccountAdmin`/`resourcemanager.projectIamAdmin` role "just in case" for the whole team — they're only for whoever does the project's initial bootstrap, not for every dev (see `manage-team-permissions`).
