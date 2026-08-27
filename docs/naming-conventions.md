# Naming convention — Linex-Loyalty organization (GitHub)

## General rule

The repository name is just the **product/service name**, lowercase and hyphenated (`kebab-case`). "linex" or "loyalty" is not repeated in the name — that redundancy is already given by the organization name (`github.com/Linex-Loyalty/...`).

```
{product}[-{layer}]
```

- `{product}`: short name of the product or service (e.g. `mint`, `agents-gateway`)
- `{layer}` (optional): only if the same product has several separate repos — `web`, `api`, `infra`, `mobile`

## Special prefixes

- `test-` or `demo-`: for test repos, spikes, or experiments that aren't real product. Delete them once no longer needed — they shouldn't pile up indefinitely.
- Never use generic names like `proyecto1`, `app1`, `nuevo-repo` — they must describe what it is.

## Same criteria applies to other names, not just repos

- **Claude skills** (`.claude/skills/<name>/SKILL.md`): verb-noun in English, descriptive of the action (`manage-team-permissions`, `choose-deploy-platform`, `connect-entra-id-firebase-auth`) — not generic ones like `skill1` or `helper`.
- **Named Firestore databases** within a shared project (e.g. `linexrewards-app`): use the same name as the product (`mint-loyalty` for the Mint product), not a generic name like `default` unless intentional.
- **App Hosting backends**: name the backend the same as the repo/product it deploys — makes it easier to identify which is which in `firebase apphosting:backends:list` when there are several in the same project.

## Notes

- Renaming a repo on GitHub **doesn't break existing links** — GitHub automatically redirects the old name to the new one.
- If you rename a repo after it's already connected to an App Hosting backend, update the local git remote (`git remote set-url origin ...`) and check the backend connection in Firebase Console — `.firebaserc` doesn't change (it uses the Firebase Project ID, not the repo name).
