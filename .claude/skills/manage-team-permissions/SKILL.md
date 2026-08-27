---
name: manage-team-permissions
description: Which exact role to request/grant based on what the person needs to do in Firebase/GCP/GitHub, and which of those roles are sensitive enough to deserve a second thought. Use when the user asks to "give someone access", "how do I join Firebase/GCP", "what Cloud Run permissions do I need", gets a permissions error, or asks about the difference between Firebase Console IAM and GCP Console IAM.
---

# manage-team-permissions

Which exact role to use depending on what needs to be done — and, just as important, which roles are sensitive enough to warrant explicit confirmation instead of being granted routinely.

## General rule: request the narrowest role that solves what you need, not the simplest one

"Give me Owner/Editor so it doesn't fail on me again" solves the symptom but opens up a much larger risk surface than necessary. Almost every permissions error in this ecosystem has a specific role that fixes it — identify it before asking for something broad.

## Firebase Console IAM == GCP IAM (same backend)

A Firebase project **is** a GCP project. Adding someone from `console.firebase.google.com/project/<ID>/settings/iam` writes the same IAM policy binding you'd see in `console.cloud.google.com/iam-admin/iam?project=<ID>` — they're not different systems, just two UIs:
- **Firebase Console**: curated list of roles relevant to Firebase products (simpler).
- **GCP Console** (or `gcloud`): full catalog (Secret Manager, IAM, Cloud Build, custom roles, conditions) — use it for whatever Firebase Console doesn't expose.

## To work on Firebase (Firestore, Auth, App Hosting as already-existing resources)

Role: **`roles/firebase.admin`** ("Firebase Admin" in Firebase Console) — full access to Firebase products without granting `Owner` on the GCP project.

## The full chain to bootstrap (create) an App Hosting backend for the first time

This is **not a single role** — verified in practice, the first time someone runs `firebase apphosting:backends:create` on a project, the error escalates in layers. Full detail and commands are in the `create-firebase-project` skill; the role list:

| # | Role | For |
|---|---|---|
| 1 | `roles/firebase.admin` | Firebase products in general |
| 2 | `roles/serviceusage.serviceUsageConsumer` | Enable/use GCP APIs |
| 3 | `roles/iam.serviceAccountUser` | Act as the SA that runs the backend |
| 4 | `roles/secretmanager.secretAccessor` | Read secrets at runtime |
| 5 | `roles/cloudbuild.builds.editor` | App Hosting builds with Cloud Build underneath |
| 6 | `roles/artifactregistry.writer` | The build pushes the image to Artifact Registry |
| 7 | `roles/iam.serviceAccountAdmin` ⚠️ sensitive | Only the 1st time: create the App Hosting SA that doesn't exist yet |
| 8 | `roles/resourcemanager.projectIamAdmin` ⚠️ sensitive | Only the 1st time: grant roles to that new SA |

**Why `firebase.admin` doesn't cover all of this:** that role lives at the Firebase products layer (apps, hosting configs, backends as an object) — creating a service account or modifying the project's IAM policy is an operation of the underlying GCP layer, governed by `iam.*`/`resourcemanager.*` roles, not `firebase.*`. Same pattern for `serviceusage.*`: Firebase Admin is broad within its domain, but doesn't absorb everything about the host project's IAM/Service Usage.

## Sensitive roles — request/grant with an explicit note, not routinely

These two roles aren't "more of the same" — they're a category jump, because they give whoever holds them the ability to affect **anyone else's** access in the project, not just their own:

- **`roles/iam.serviceAccountAdmin`** — can create/delete service accounts and manage their keys (although creating JSON keys is blocked at the organization level, see `docs/org-context.md`; even so, it can create new identities).
- **`roles/resourcemanager.projectIamAdmin`** — can grant or revoke **any role to any user** in the project, including, in theory, granting themselves `roles/owner`.

**When they're actually justified:** only for whoever does the initial bootstrap of a new project/backend (see table above, roles 7-8), not for every dev on the team permanently. Once the backend/service account already exists, consider whether those roles are still needed for that person or can be removed.

**When to request them with an explicit note:** always. Don't include them in a batch "give me all the roles I need" without flagging them separately — whoever grants them should know exactly what they imply before saying yes.

## To deploy to Cloud Run

**A single role isn't enough.** All three are needed together, or the deploy fails halfway:

| Role | For | Without it, fails with |
|---|---|---|
| `roles/run.developer` | Deploy/manage the service (doesn't touch others' IAM) | — |
| `roles/artifactregistry.writer` | Push the container image | Error pushing the image |
| `roles/iam.serviceAccountUser` (scoped to the service's specific Service Account, not project-wide) | Allows "acting as" that SA when deploying | "actAs" error running `gcloud run deploy` even with `run.developer` |

`roles/run.admin` (full control including IAM) is more than a regular dev needs — reserve it for leads/DevOps.

If they also manage the service's secrets: `roles/secretmanager.secretAccessor` (read) or `.admin` (create/rotate) — see `manage-secrets`.

## GitHub permissions (independent of GCP)

Without repo access they can't push even with all the roles above:

- `Settings → Collaborators and teams → Add people` — Write level if they push directly, less if they only work through PRs.
- **Branch protection on `main`**: require a PR before merging, if `main` triggers an automatic deploy (App Hosting, or a Cloud Run pipeline). This turns "who deploys to production" into "who can approve a PR" — more governable than handing out loose cloud roles.
- Repo names: see `docs/naming-conventions.md`.

### Important gotcha: App Hosting has NO concept of "approving a deploy"

App Hosting only reacts to whatever lands on its configured "live branch" — it doesn't know what a PR is or who approved it. **The only real gate is branch protection on GitHub.**

## The recommended pattern for "real self-service" (team, not just you)

Instead of giving `run.developer`/`artifactregistry.writer` to each dev directly:

1. Set up **Workload Identity Federation** (GitHub ↔ GCP, with no stored service account keys — remember that creating keys is blocked at the org level, see `docs/org-context.md`) — done **once** at the GitHub organization level, and any new repo inherits it.
2. Deploy roles go on the **CI pipeline's Service Account**, not on human accounts.
3. Devs only need write access to the repo — the actual deploy is triggered by the merge to `main`.
4. The pipeline is a **reusable template** (build → push to Artifact Registry → deploy) that a new repo copies, not something each dev invents from scratch.

Benefit: every deploy is tied to a commit/PR (auditable) instead of "someone ran `gcloud` from their laptop" — and nobody needs sensitive Cloud Run/IAM permissions on their personal account.

## Gotcha already found

A project's real Project ID may not match the folder/repo name (e.g. folder `mint-loyalty` → real Project ID `linexrewards-app`, see `.firebaserc`). Using the wrong name in any `gcloud`/`firebase --project` command fails with "Project not found".
