---
layout: post
title: "Server-Side Dart Doesn't Have a Task Queue. So I Ported the Idea From Go."
date: 2026-07-08 12:30:00 +0300
tags: [dart, redis, backend, server-side-dart]
---

![redis_task_queue — enqueue, worker, retries, dead-letter](https://raw.githubusercontent.com/Yusufihsangorgel/redis_task_queue/main/doc/cover.png)

Every backend I've run has the same small pile of work that shouldn't be in the request path: send the welcome email, resize the upload, call the flaky third-party API that times out one time in fifty. If any of that runs inside the request, a slow dependency becomes a slow response, and a failing dependency becomes a 500 the user actually sees.

In Go, the answer is boring and settled. You reach for [Asynq](https://github.com/hibiken/asynq) — a Redis-backed task queue — drop the work on a queue, return immediately, and let a separate worker process it with retries. I've leaned on that pattern in Go for a while; I even [wrote it up as a Fiber recipe](https://github.com/gofiber/recipes/pull/4997) recently.

Then I went looking for the same thing in server-side Dart, and it wasn't there.

## The gap is real

Dart on the server is growing up. Serverpod and Dart Frog are both past a few thousand stars and people are shipping real backends on them. But "get this slow thing out of the request and retry it if it fails" — the most ordinary backend need there is — doesn't have a maintained answer.

I looked. The queue packages on pub.dev are either abandoned or never got traction: a couple of likes, a few dozen downloads a month, last touched years ago. Nothing you'd put in front of production. In Go or Ruby you'd never write this yourself; in Dart, there's a hole where the obvious library should be.

So I filled it, deliberately small: [`redis_task_queue`](https://pub.dev/packages/redis_task_queue). A producer drops a task on Redis and returns; a worker picks it up, runs it, and retries on failure until it either succeeds or lands in a dead-letter list.

```dart
// in your request path
await client.enqueue(
  Task('email:welcome', {'user_id': '42'}),
  queue: 'default',
  maxRetries: 5,
);

// in a separate worker process
worker.handle('email:welcome', (task) async {
  await sendWelcomeEmail(task.payload['user_id'] as String);
});
await worker.run();
```

That's the whole surface. The rest of this post is about the decisions behind it — because with a library this small, the decisions *are* the work.

## What I kept from Asynq

Three things from the Go model earned their place, because I'd felt the absence of each one in production.

**The type/payload split.** A task is a string type (`email:welcome`) plus a JSON payload. The side that enqueues and the side that processes only have to agree on a string and a shape — not share code, not import each other. That decoupling is why you can move a handler to a different process, or a different deploy, without touching the caller. It's the single most useful idea in Asynq and it costs almost nothing to copy.

**Weighted queues.** Not just multiple queues — *weighted* ones. With `{'critical': 6, 'default': 3, 'low': 1}` the worker polls `critical` about six times as often as `low`. The reason this matters isn't throughput, it's starvation: the first time a batch job dumps ten thousand low-priority tasks onto a shared worker and your password-reset emails sit behind them for an hour, you learn that "just use a queue" isn't enough. Priority has to be in the design, not bolted on.

**A dead-letter list, not an infinite retry.** A task that keeps failing has to stop somewhere. After `maxRetries`, the envelope moves to a `dead` list instead of looping forever. A loop that never ends is worse than a failure you can see — the dead-letter list is how you find out *what* failed and *why* the next morning, instead of discovering it as a pegged CPU.

## What I deliberately left out

Here's where I part ways with the instinct to match Asynq feature-for-feature. Asynq is years of production hardening. Copying its surface would mean copying complexity I can't yet stand behind, into a first version. So `0.1.0` leaves real things out, on purpose, and says so:

- **Retries are immediate, not backed off.** A production queue delays re-enqueues with an exponential backoff — usually via a Redis sorted set scored by "run after this timestamp." I know how to build that; I left it out of the first cut so the core retry path stays readable, and I wrote the limitation directly into the README rather than hiding it. It's the first thing I'll add.
- **No scheduler, no cron, no unique-task dedup, no web dashboard.** Asynq has all of these. Each is a real feature and each is its own project's worth of edge cases. A first version that does the `enqueue → process → retry → dead-letter` core *clearly* is more useful — and more trustworthy — than one that does eight things vaguely.

I'd rather ship a small thing that's honest about its edges than a big thing that hides them. Someone evaluating a queue for real work needs to know exactly where it stops, and a dependency that oversells itself is worse than one that under-promises.

## The part that actually bit me

The one genuinely non-obvious bug was in the worker's poll loop, and it's the kind of thing you only find by running it.

The worker does a blocking pop across the weighted queue keys — `BRPOP key1 key2 ... 1` — which either returns `[key, value]` when a job is waiting or blocks for up to a second and then times out. I assumed a timeout came back as `null`. It doesn't. The Redis client hands back `[null]` — a one-element list whose only element is null. My first guard checked `if (res == null)`, which was never true, so on every idle second the worker tried to decode `res[1]` off a list that only had a null at index 0, and threw.

An idle worker — the completely normal state — was crashing. The fix is one line (`if (res.isEmpty || res.first == null) continue;`), but I'd never have guessed the shape from the docs. I only caught it because I wrote a test that runs a real worker against a real Redis and lets it sit idle. The lesson I keep relearning: the bugs that matter live in the boring states — idle, empty, timed-out — not the happy path you naturally reach for first.

## When to actually use this

I want to be straight about the ceiling, because that's the useful part.

If you're on a JVM or Go stack, use the mature thing — Sidekiq, Asynq — not this. If you need scheduled/delayed jobs *today*, `0.1.0` isn't there yet. But if you're building a server-side Dart app and you want to get slow, retryable work out of the request path without pulling in a second language or a heavyweight broker, this is a small, readable, tested option that does exactly that and nothing it can't back up.

The code is on [GitHub](https://github.com/Yusufihsangorgel/redis_task_queue) and [pub.dev](https://pub.dev/packages/redis_task_queue). If you want the mechanics rather than the reasoning — how the weighted polling and the dead-letter path actually work, line by line — I wrote that up [separately](https://dev.to/yusufihsangorgel/a-redis-task-queue-in-dart-weighted-polling-dead-letters-and-one-nasty-empty-poll-bug-53ap).

The broader point isn't the library. It's that a growing ecosystem gets its missing pieces filled one small, honest package at a time — and that the interesting decisions in a small library aren't what you put in, but what you're disciplined enough to leave out.
