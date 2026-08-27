# Required tools before starting

A builder doesn't need to know this in advance — the `start-builder-project` skill validates this list automatically at the start and tells you exactly what's missing and what to ask IT for if you don't have permission to install it yourself.

## Minimum list

| Tool | For | Check with | Install |
|---|---|---|---|
| **Node.js 20+** | Next.js/Angular runtime, required by App Hosting | `node --version` | [nodejs.org](https://nodejs.org) (LTS) — or ask IT to install it if the machine is corporate-managed |
| **npm** (comes with Node) | Dependency management | `npm --version` | Included with Node.js |
| **git** | Version control | `git --version` | [git-scm.com](https://git-scm.com) |
| **GitHub CLI (`gh`)** | Create repos, PRs, manage access without leaving the terminal | `gh --version` | [cli.github.com](https://cli.github.com) — then `gh auth login` |
| **Firebase CLI (`firebase`)** | Create/manage projects, App Hosting backends, secrets | `firebase --version` | `npm install -g firebase-tools` — then `firebase login` |
| **Google Cloud CLI (`gcloud`)** | Everything the Firebase CLI doesn't cover: IAM, Secret Manager, Cloud Build, Artifact Registry | `gcloud --version` | [cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install) — then `gcloud auth login` |

## Only if your project needs it

| Tool | When | Check with |
|---|---|---|
| **Azure CLI (`az`)** | Only if you're going to touch the Entra ID side directly (create a new App Registration — most cases do NOT need this, see `connect-entra-id-firebase-auth`) | `az --version` |
| **Docker** | Only if you're going to build/test a local container before Cloud Run (App Hosting doesn't require it, the build is automatic) | `docker --version` |

## What to do if something is missing and you don't have install permissions

If your machine is corporate-managed and you can't install software directly:

1. Identify exactly what's missing using the check commands in the table.
2. Ask IT for the specific install — name the tool and, if applicable, the minimum version (e.g. "I need Node.js 20 LTS and Google Cloud CLI for development, builder-skills project").
3. Don't push forward improvising with old versions already installed "because something similar is already there" — outdated versions of `gcloud`/`firebase-tools` are a common source of confusing errors unrelated to your code.

## Authentication (after installing)

Each CLI needs its own login — installing isn't enough:

```bash
gh auth login          # GitHub
firebase login         # Firebase
gcloud auth login      # Google Cloud
gcloud auth application-default login   # credentials for SDKs/libraries running locally against GCP
```

If you're going to work on more than one GCP project with different accounts, check `gcloud config configurations list` — it's safer than switching `gcloud config set account` back and forth.
