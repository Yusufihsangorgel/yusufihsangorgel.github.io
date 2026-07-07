---
layout: post
title: "I Run 17 Products From One Go Binary. Here's the Case For and Against."
date: 2026-07-07 08:30:00 +0300
tags: [go, architecture, backend, self-hosting]
---

A few years ago, every app I built had its own backend. Its own database. Its own deploy pipeline. That felt right — it's what every tutorial tells you to do.

Then I had a dozen of them, and I was one person.

Every new app multiplied the number of things that could break at 3am. A dozen backends meant a dozen deploy pipelines, a dozen databases to back up, a dozen sets of logs to grep through when something went wrong. The architecture that felt "clean" for one app was quietly drowning me at twelve.

So I did something that still makes some engineers wince when I describe it: I put everything behind **one Go binary**. Today that gateway serves 17 product modules — 546 routes in total — from a single process, backed by one Postgres instance. One person maintains it.

I've since pulled a minimal version of the pattern into an [open-source reference](https://github.com/Yusufihsangorgel/go-multitenant-gateway) so I can point at the shape without the product code. This post isn't about the code, though. It's about whether the decision was right — honestly, on both sides.

## The case for one binary

The thing nobody tells you when you're starting out: for a small team, compute is not the expensive part. Operational surface is.

The expensive part is the number of independent things that can fail, deploy, and page you. Every service you add is another deploy to babysit, another log stream, another place a config drift can hide. When you're one person, that number is the whole ballgame.

One binary collapses it:

- **One deploy.** A single artifact. Ship it, and everything ships. Roll it back, and everything rolls back — instantly, to the previous image.
- **One place for cross-cutting concerns.** Auth, rate limiting, tenant resolution, request tracing — written once, in one middleware chain, not re-implemented per service.
- **One mental model.** When something breaks, there's one process to reason about, not a distributed system to trace a request across.

Adding a product became almost free. A new module is a directory and one line that registers its routes. No new service, no new database, no new pipeline. That "almost free" is the entire reason the thing scaled to 17 modules without scaling me.

## The case against — which is real, and which I don't hide

Here's where I part ways with people who'd sell you this as a clean win. It isn't. It has a bill, and the bill is real.

**A shared failure domain.** One binary means one bad deploy takes everything down at once. There's no bulkhead. I mitigate it — instant rollback, health checks gating the routes — but I don't pretend it away. This is the single biggest cost of the choice, and if you have a product that needs its own uptime guarantee, this design is wrong for it.

**Modularity by discipline, not by boundary.** In a microservice setup, the network forces separation — service A physically cannot reach into service B's internals. In one process, nothing stops a lazy import from coupling two modules that should never know about each other. Staying modular is on me and code review, not on the architecture. That's a weaker guarantee, and I feel it every time the codebase grows.

**One Postgres for everyone.** I isolate tenants by schema, not by database — one shared cluster, a schema per tenant. That gives me one connection pool, one backup, one thing to tune. The cost is blast radius: a runaway query or a mistaken migration can reach neighbors. It's the right trade at my scale. It would be the wrong trade the moment one tenant needs a real SLA of its own.

## What I'd actually change

If I were grading my own system, three things:

1. **The biggest module is doing too much.** One of the 17 is far larger than the rest. It's the first thing I'd break out into its own service — not because one-binary is wrong, but because that specific module has outgrown the shared failure domain.
2. **I'd make the failure domain explicit.** Per-module circuit breaking, so one product's bad path can't cascade inside the process. Right now the isolation is conceptual; it should be enforced.
3. **Per-tenant databases for the few that need it.** Keep schema-per-tenant as the default for the long tail, but graduate the handful that need real isolation.

## The actual lesson

The point isn't "one binary good, microservices bad." The point is that architecture decisions are trades, and the right trade depends on a constraint most tutorials never state: how many people are running this thing?

At one person and many products, the operational surface of microservices would have buried me long before their isolation benefits paid off. So I traded isolation for operability, on purpose, with my eyes open about what it costs. When the constraint changes — when a product earns its own SLA, when there's a team to run it — the trade changes with it, and the schema boundary is exactly where I'd cut.

That's the part I think separates a decision from cargo-culting: not which pattern you pick, but whether you can say out loud what it costs you.

---

*The reference implementation — a single-binary multi-tenant gateway with tenant resolution, per-tenant rate limiting, and JWT auth — is on [GitHub](https://github.com/Yusufihsangorgel/go-multitenant-gateway). It's the pattern, minus the product code.*
