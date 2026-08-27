---
name: manage-secrets
description: How we handle secrets and environment variables in apps deployed on Firebase App Hosting (apphosting.yaml + Secret Manager) or Cloud Run. Use when the user asks to "add an environment variable", "create a secret", "I need to store an API key", or to debug why an env var isn't reaching the deployed backend.
---

# manage-secrets

Flow for setting up environment variables and secrets, without repeating the project/identity gotchas that already cost us detours in other projects.

## Rule number one

**Never paste a sensitive value (API key, token, password, client secret) into the chat with the assistant, into a commit, or into a versioned file.** If you need a secret stored, create it directly in Secret Manager (the commands below leave the prompt hidden) — the assistant doesn't need to see the real value to set up the reference.

## Deciding: plain value or secret?

- **Not sensitive** (public URLs, flags, public OAuth client IDs, any `NEXT_PUBLIC_*`): `value:` directly in `apphosting.yaml`.
- **Sensitive** (tokens, API keys, client secrets, third-party credentials): create it in Secret Manager and reference it with `secret:`.

Not everything needs to be a secret — mix them as needed.

## Identity gotchas (check before running anything)

- The **local folder/repo name is not the Project ID**. Always check `.firebaserc` before using `--project` in any command — using the wrong name fails with "Project not found".
- If the project uses a **named Firestore database** (not `(default)`), any script you use to populate/read data must pass that name explicitly to the Admin SDK — check `firebase.json` (`firestore.database`) before assuming.

## Creating a secret (Firebase App Hosting)

Via Firebase CLI (creates + gets it ready to associate with the backend):
```bash
firebase apphosting:secrets:set VARIABLE_NAME --project <project-id>
# hidden prompt: paste the real value there, don't write it anywhere else
```

Grant backend access (once per secret):
```bash
firebase apphosting:backends:list --project <project-id>   # to see <backend-id>
firebase apphosting:secrets:grantaccess VARIABLE_NAME --backend <backend-id> --project <project-id>
```

Equivalent with `gcloud` (useful in a script/CI):
```bash
echo -n "VALUE" | gcloud secrets create VARIABLE_NAME --data-file=- --project=<project-id>
gcloud secrets add-iam-policy-binding VARIABLE_NAME \
  --member="serviceAccount:<backend-sa>@<project-id>.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" --project=<project-id>
```

## Creating a secret (Cloud Run)

Same Secret Manager, a different way to associate it:
```bash
gcloud secrets create VARIABLE_NAME --data-file=- --project=<project-id>
gcloud run services update <service> \
  --update-secrets=VARIABLE_NAME=VARIABLE_NAME:latest \
  --region=<region> --project=<project-id>
```

## Editing `apphosting.yaml`

```yaml
env:
  - variable: VARIABLE_NAME
    secret: VARIABLE_NAME     # if it's a secret (the secret name and env var name can match)
  - variable: OTHER_VARIABLE
    value: https://example.com  # if it's a plain value
```

## Verifying it worked

```bash
firebase apphosting:secrets:access VARIABLE_NAME --project <project-id>
# or
gcloud secrets versions access latest --secret=VARIABLE_NAME --project=<project-id>
```

Direct link to a project's Secret Manager: `https://console.cloud.google.com/security/secret-manager?project=<project-id>`

## Rotation

If the secret is a third-party credential with an expiration (OAuth client secret, API key with scheduled rotation), set a reminder before it expires — an expired secret with no warning translates into "the login/integration stops working without anyone touching code", the most confusing symptom to diagnose in hindsight.

## What NOT to do (blocked at the organization level, not just bad practice)

Don't try to solve "I need this script to act as a given service" by creating a **service account JSON key** (`gcloud iam service-accounts keys create`) — it's disabled at the organization level (`iam.disableServiceAccountKeyCreation`, see `docs/org-context.md`). It will fail with a policy error, not an insufficient-permissions one. The correct alternative:
- **Local/CI:** Workload Identity Federation (no stored keys).
- **Running inside GCP** (Cloud Run, App Hosting, Cloud Functions): Application Default Credentials — the environment already has an identity, you don't need any key.

## Don't forget

- The change in `apphosting.yaml` only takes effect on the **next** App Hosting rollout — it's not immediate.
- If the local build/dev fails looking for the variable, check that it's in `apphosting.yaml` (deploy) **and**, if you need it locally, in a `.env.local` (not versioned, in `.gitignore`).
