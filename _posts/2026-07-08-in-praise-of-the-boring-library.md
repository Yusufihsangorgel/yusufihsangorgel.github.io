---
layout: post
title: "In Praise of the Boring Library"
date: 2026-07-08 18:20:00 +0300
tags: [open-source, dart, software-craft]
---

![redis_task_queue](https://raw.githubusercontent.com/Yusufihsangorgel/redis_task_queue/main/doc/cover.png)

*Server-side Dart was missing an obvious piece. Building it taught me more about restraint than about Redis.*

There's a specific small disappointment every engineer knows: you reach for the obvious library, the one that surely exists, and it isn't there.

It happened to me recently in server-side Dart. I wanted to move some slow work — sending an email, calling a third-party API that fails one time in fifty — out of the request path and onto a queue, so a failure could be retried instead of becoming a 500 the user sees. In Go this is a solved, boring problem: you reach for Asynq, and you move on with your day. I went looking for the Dart equivalent, and the shelf was empty.

Not *literally* empty. There were a few packages. But they had two likes, a few dozen downloads a month, a last commit from years ago. The kind of package you can tell was written once for one project and quietly abandoned. Nothing you'd put in front of production traffic.

That gap is interesting, and not because it's a complaint.

## The missing obvious piece

A young ecosystem announces its maturity in a strange way: by which boring things are still missing.

Nobody is impressed by a task queue. It's plumbing. In Go or Ruby or Python it's so settled that reaching for it is muscle memory — you'd no sooner write your own than write your own HTTP client. That very boringness is what makes its absence loud. When the exciting things exist but the boring ones don't, the ecosystem is still young. Server-side Dart has real web frameworks now, thousands of stars between them, people shipping actual backends. But the unglamorous connective tissue — the queue, the scheduler, the thing that retries — is thin.

Which means the most valuable open-source contribution you can make there isn't clever. It's boring. It's the piece everyone will need and nobody wants to write, because there's no novelty in it, only usefulness.

So I wrote the boring thing. A small Redis-backed task queue: put work on a queue, return immediately, let a separate worker run it with retries, and if it keeps failing, set it aside in a dead-letter list instead of looping forever. That's the whole idea. It is deeply unoriginal, and that is exactly the point.

## Restraint is the actual skill

Here's what surprised me. The hard part wasn't the Redis. It was deciding what to *leave out*.

Asynq — the Go library I was homesick for — is years of production hardening. It has scheduled jobs, delayed retries with exponential backoff, unique-task deduplication, a web dashboard. Every one of those is genuinely useful. And every instinct I had said to match it, feature for feature, so my version would look serious.

That instinct is a trap. Copying a mature library's surface into a first version doesn't give you a mature library — it gives you a large, shallow one, full of features you haven't earned the right to claim work. A first version that does one thing — enqueue, process, retry, dead-letter — and does it in code you can read top to bottom is more trustworthy than one that does eight things vaguely and hides where each one breaks.

So I cut. The first version had no scheduler, no backoff — retries ran immediately — and no dashboard, and I wrote each limitation into the README instead of burying it. Backoff earned its way into a later version, once I'd watched immediate retries hammer a failing dependency and understood exactly why it was worth the extra code; the scheduler and dashboard I still haven't added, because I haven't needed them yet. What shipped stayed small enough to hold in your head, and honest about exactly where it stopped.

I've come to think that's the real craft in a small library: not what you're clever enough to add, but what you're disciplined enough to leave out, and whether you can say plainly what it costs you. A dependency that oversells itself is worse than one that under-promises. The person evaluating it for real work doesn't need to be impressed; they need to know precisely where the edge is.

## The bugs live in the boring places, too

Even the one real bug fit the theme. The worker crashed on an *idle* queue — the most boring state there is — because I'd guessed wrong about what an empty poll returns. Not the busy path, not the clever path. The nothing-is-happening path, which is where a queue spends most of its life. I only caught it because I tested the queue doing nothing, against a real Redis, and watched it fall over.

The unglamorous states are where the truth is. Idle, empty, timed-out, retried-one-too-many-times. That's true of the code, and I suspect it's true of the work in general.

## Build the boring thing

I don't think this package will make anyone famous, and it isn't supposed to. It fills a hole that shouldn't have been there, in code someone can actually read, with its limits stated out loud. If a handful of people building on Dart get their slow work off the request path because of it, that's the entire return, and it's enough.

The exciting libraries get written. They always do. It's the boring, obvious, missing ones — and the restraint to keep them small and honest — that quietly tell you an ecosystem, and maybe an engineer, is growing up.

---

*The library is [`redis_task_queue`](https://pub.dev/packages/redis_task_queue) on pub.dev; source on [GitHub](https://github.com/Yusufihsangorgel/redis_task_queue). If you want the engineering rather than the reflection — how the weighted polling and dead-letter path actually work — I wrote that up [here](https://dev.to/yusufihsangorgel/a-redis-task-queue-in-dart-weighted-polling-dead-letters-and-one-nasty-empty-poll-bug-53ap).*
