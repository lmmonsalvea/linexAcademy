---
name: choose-deploy-platform
description: Decides where to deploy a new service (Firebase App Hosting, Cloud Run, or GKE) and how to interconnect it with what already exists. Use when the user asks "where do I deploy this", "should I use Cloud Run or GKE", "can I put this on Firebase", "I need a new backend/microservice", or asks to compare cost/architecture between GCP platforms.
---

# choose-deploy-platform

Decision guide for where a new app or service lives. Not generic GCP theory — these are rules we've already verified in production.

## Golden rule

Firebase **App Hosting** only has official/optimized support for **Next.js 13.5.x+** and **Angular 18.2.x+** (source: [firebase.google.com/docs/app-hosting/frameworks-tooling](https://firebase.google.com/docs/app-hosting/frameworks-tooling)). There's a secondary "community-supported" door for Nuxt and Express, but Google itself says *"support is not guaranteed"* — don't count on that for anything serious. It runs on Node.js 20+ and, underneath, on **Cloud Run revisions** (it's not a separate technology, it's a specialized build layer on top of Cloud Run).

If the new service is in another language/framework (Python, .NET, Go, or anything outside Next.js/Angular), **there's no real option**: it goes to Cloud Run or GKE. It's not an architecture preference, it's a hard platform limitation.

**Classic** Firebase Hosting (different from App Hosting) is just a static-file CDN — it doesn't run backends either.

## Decision tree

1. **Is it the main web app (Next.js/Angular) serving pages + its own API routes?**
   → Firebase App Hosting. See the `create-firebase-project` skill for the bootstrap, and `manage-secrets` for env vars/secrets.

2. **Is it a separate service (another repo, another language, another deploy cycle)?**
   → Cloud Run by default. Only consider GKE if:
   - You already have sustained 24/7 load at scale with several services sharing nodes (bin-packing), or
   - You need network/GPU/service-mesh control that Cloud Run doesn't provide.
   - If traffic has a "business hours" pattern (drops at night/weekends), Cloud Run almost always wins on real cost because it scales to zero outside those hours — GKE keeps nodes running 24/7 unless very aggressive node autoscaling is set up (rare in practice).
   - And GKE implies real operational cost (patching, upgrades, node management) that Cloud Run doesn't have — it weighs on TCO even if the raw infra comes out similar in the calculator.

3. **"But it's Next.js, so it should fit on Firebase"?**
   Even if it were Next.js, if it's conceptually a separate service (another repo/team/deploy cycle, not "the website"), it's still a better candidate for Cloud Run — App Hosting is designed for a single app serving pages, not for hosting internal services.

## How they interconnect (Firebase front ↔ Cloud Run/GKE back)

There's no special integration — it's normal HTTPS between two URLs:

1. The front knows the backend's URL via an env var in `apphosting.yaml` (see `manage-secrets`).
2. The backend allows the front's origin in **CORS**.
3. User identity is propagated as a **Bearer token**. The right way: Firebase Auth's ID token, verified on the backend against Firebase's public JWKS (a library like `firebase-admin` or any standard JWT validator — the backend doesn't need to "be" Firebase).
   - **Gotcha already found in a real service:** decoding the JWT without verifying the signature ("trust asserted") is acceptable tech debt only in a prototype — never copy it as a pattern for something going to real production with sensitive data.
4. If the backend shouldn't be public: Cloud Run with `ingress: internal` + restricted `roles/run.invoker`, or GKE with a private cluster + internal Load Balancer.

## Before deciding, ask (don't assume)

- What's the traffic volume and shape? (constant 24/7 vs. concentrated in business hours — changes the Cloud Run vs GKE answer)
- Are there already other services running on GKE that could share nodes? (if not, GKE starts at a fixed-cost disadvantage)
- Does the team have the capacity to operate a cluster, or do they need something fully managed?
- Can your app live in the shared GCP/Firebase project (`linexrewards-app`, see `docs/org-context.md`) or does it need a separate one for real cost/security isolation?
