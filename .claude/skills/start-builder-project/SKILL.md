---
name: start-builder-project
description: Entry point for a builder who wants to start a new project/app. Validates installed tools, asks what's being built, and routes to the right skill (deploy platform, Firebase, secrets, SSO, permissions). Use when the user says "I want to create a new app", "how do I start a project", "I need to set something up from scratch", or when bringing this skills kit into a new repo for the first time.
---

# start-builder-project

This is the skill a builder runs first, before knowing anything about GCP/Firebase/permissions. Its job is to keep them from getting stuck on decisions we've already resolved, and from moving forward with half-installed tools.

## Step 0 — Validate installed tools

Before asking anything, run this and check what's missing (full detail and what to install in `docs/required-tools.md`):

```bash
node --version && npm --version && git --version && gh --version && firebase --version && gcloud --version
```

- If **any** of `node`, `npm`, `git`, `gh`, `firebase`, `gcloud` is **missing**: tell the user exactly which one is missing and what to install (see table in `docs/required-tools.md`). **Don't move forward improvising** — if the user doesn't have install permissions on their machine, tell them exactly what to ask IT for (tool name + minimum version).
- If Node exists but is **below 20**, flag it — App Hosting requires Node 20+ and a build can fail confusingly on an old version.
- Also verify they're authenticated, not just installed:
  ```bash
  gh auth status
  firebase login:list
  gcloud auth list
  ```
  If no account shows as active, walk the user through logging into each one before continuing (commands in `docs/required-tools.md`).

## Step 1 — Ask what's being built (don't assume)

Minimum questions before recommending anything:

1. **What type of app is it?** (web app with pages + its own logic / separate service/API in another language / both)
2. **Does it need login?** If yes: corporate account login (Microsoft/Entra ID) or just Google/email?
3. **Does it need to store data?** (database, files)
4. **Does it need any third-party API key or credential?** (Plaid, Gemini, Stripe, whatever)
5. **Will it live in a new repo or inside an existing one?**

Don't move on to the next steps without these answers — each one determines a different skill.

## Step 2 — Route based on the answers

| If the builder answered... | Go to |
|---|---|
| "It's a website with pages + its own logic (Next.js/Angular)" | `choose-deploy-platform` (confirm App Hosting applies) → then `create-firebase-project` |
| "It's a separate service, another language, another deploy cycle" | `choose-deploy-platform` (routes you to Cloud Run/GKE — this kit doesn't cover that infrastructure detail, it's a different domain) |
| "It needs corporate login (Microsoft/Entra ID)" | `connect-entra-id-firebase-auth` — **first check whether your app will live in `linexrewards-app`**, because everything is already set up there and nothing new needs to be created (see `docs/org-context.md`) |
| "It needs to store an API key or sensitive credential" | `manage-secrets` |
| "I don't know what GCP permissions to request / I'm getting a permissions error" | `manage-team-permissions` |

## Step 3 — The real bootstrap checklist (once the platform is decided)

If the result of Step 2 is Firebase App Hosting, the real order (verified, not theoretical) is:

1. Confirm whether your app goes in the shared `linexrewards-app` project or needs a separate one (see `docs/org-context.md`, section "What to reuse vs. what to create new").
2. `create-firebase-project` — create/confirm the project, enable App Hosting, create the backend connected to your GitHub repo.
3. If your app needs to store data: create a Firestore database (named, not the default one if sharing a project with other apps).
4. `manage-secrets` — any API key or credential goes here, not as plain text in the code or in the chat.
5. If it needs corporate login: `connect-entra-id-firebase-auth`.
6. `manage-team-permissions` — before requesting an IAM role, confirm which one is correct for what you're going to do (don't ask for "full access" because it's simpler).
7. Initial deploy and verify the rollout before considering the bootstrap closed.

## Mistakes already made — don't repeat them

- Confusing the local folder/repo name with the real Firebase/GCP Project ID → always check `.firebaserc`, never the terminal prompt.
- Requesting a broad IAM role (`Editor`, `Owner`) "so it doesn't fail again" instead of the specific role that's actually missing — there's almost always a specific, narrow role that resolves the real error (see `manage-team-permissions`).
- Creating a new GCP/Firebase project when the app could have lived in `linexrewards-app` — check `docs/org-context.md` before assuming you need a separate one.
- Trying to create a service account JSON key for a script or CI — it's blocked at the organization level (`iam.disableServiceAccountKeyCreation`, see `docs/org-context.md`). The answer isn't "request the permission", it's using another mechanism (Workload Identity Federation / Application Default Credentials).
