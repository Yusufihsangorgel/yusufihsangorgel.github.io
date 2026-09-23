---
layout: post
title: "Making an MCP client library checkable: a runnable example, bounded pagination and a weekly conformance run"
date: 2026-09-23 12:02:58 +0300
tags: ["dart", "model-context-protocol", "open-source", "testing"]
devto_url: "https://dev.to/yusufihsangorgel/making-an-mcp-client-library-checkable-a-runnable-example-bounded-pagination-and-a-weekly-i49"
canonical_url: "https://dev.to/yusufihsangorgel/making-an-mcp-client-library-checkable-a-runnable-example-bounded-pagination-and-a-weekly-i49"
description: "A Dart MCP package earns trust when a reader can run it, when its list helpers stop after a bounded number of pages by default, and when CI checks it against the protocol's conformance suite every week."
---

*Also published on [dev.to](https://dev.to/yusufihsangorgel/making-an-mcp-client-library-checkable-a-runnable-example-bounded-pagination-and-a-weekly-i49).*

*Disclosure: this article was drafted with AI tools from my own merged pull requests and reviewed before publishing. Every technical claim links to the pull request or file it comes from.*

A Dart package for the Model Context Protocol earns trust in three ways. A reader can clone the repository, run a client and a server, and watch them talk. A caller can use helpers that list everything a server has and that, by default, stop after a fixed number of pages. A scheduled job checks the package against the protocol's own conformance suite on a regular cadence. This article walks through the pull requests that made those three things true for `package:dart_mcp`, plus two protocol edge cases and the documentation that holds it together.

## A runnable client and server pair

The repository already had a server example at `example/streamable_http_server.dart`, but no client to pair with it. The example readme described how to poke the server with a curl command. That is a workable smoke test, but it does not exercise the package from the client side, and it does not show a reader what a real client session looks like.

[PR #671](https://github.com/dart-lang/ai/pull/671) added a streamable HTTP client example. It takes the URL the server prints when it starts, discovers the server, lists its tools, calls `greet`, and prints the progress notification that arrives while the call runs. The example readme now describes the pair of programs instead of the curl command.

This is the kind of change that looks small and pays out repeatedly. Anyone can now run both sides locally, watch the handshake and the tool call happen, and confirm that progress notifications actually flow. The work was part of issue #668.

## Walking every page without walking forever

The MCP list requests can page their results. A server returns a page of items and a `nextCursor`, and the client sends the cursor back to get the next page. A client that wants every tool from a server that pages its list has to thread the cursor by hand: call, check for a cursor, call again with it, accumulate, repeat.

[PR #682](https://github.com/dart-lang/ai/pull/682) moved that loop into the package. Four new methods, `listAllTools`, `listAllResources`, `listAllResourceTemplates` and `listAllPrompts`, walk the pages and yield the items as a `Stream`. Callers get a stream of items and never think about cursors.

Two details in that pull request matter more than the convenience.

First, each single-page method stays byte-identical. Existing callers keep their exact behaviour, and the new helpers sit beside them rather than replacing them. If you only want the first page, the old method still gives you exactly that.

Second, by default the helpers stop. A buggy or hostile server could return a cursor on every page indefinitely, and a naive `while (cursor != null)` loop would spin without end. The new methods carry a default bound of 64 pages and throw when they exceed it. Passing `null` as the bound lifts it for callers who genuinely want unbounded walking. The tests cover the cursor threading, the bound, the argument check and an empty page.

The bound is the part I would argue for hardest. A helper that can hang turns a server bug into a stuck client process. Making the safe behaviour the default and the unsafe one an explicit opt-in is the right shape for this API. Worth noting that the conformance fixture under `tool/` drops `nextCursor` today, meaning the existing fixture never exercises pagination, and the tests had to cover it directly. This work was part of issue #28.

## Two protocol edges: sampling content and 415

Two smaller pull requests fixed corners of the protocol surface.

[PR #685](https://github.com/dart-lang/ai/pull/685) addressed sampling content. In the schema, both `SamplingMessage.content` and `CreateMessageResult.content` accept five block types or an array of them. The getter cast straight to a single block, and a list on the wire threw. Issue #672 flagged that array-valued message content wanted its own change. After the pull request, both shapes read as a list, with one block still going out as that block on serialization. Reading accepts what the schema permits, while writing keeps the simple form simple.

[PR #684](https://github.com/dart-lang/ai/pull/684) changed the error code, not the status. A request whose body is not `application/json` still gets 415, but the JSON-RPC error in that response was `HeaderMismatch`, and the schema binds `HeaderMismatch` to `400 Bad Request`. A revision that requires the `Mcp-Method`, `Mcp-Name` and `MCP-Protocol-Version` headers does not count a media type among them, and elsewhere in the same file that code always pairs with 400. That response now carries a generic invalid request error, the code an oversized body already gets with its own 413. One bookkeeping note: since the handler landed after 0.5.2, its changelog line states the behaviour rather than describing a change.

## Checking against the conformance suite every week

[PR #675](https://github.com/dart-lang/ai/pull/675) made the repository run the MCP conformance suite against both fixtures under `tool/` on a schedule. The triggers are a weekly schedule, a manual dispatch, or any pull request that changes the package.

The details of the job reflect where the suite itself stands. The suite is still an alpha npm package, and the job carries `continue-on-error`, meaning a failure stays visible without failing the run. That is the honest configuration for a dependency that is expected to shift underneath you: you want to see the signal without gating every commit on an alpha tool.

The results give a concrete picture. Every scored 2026-07-28 scenario passes on the server run, with only the `tasks` extension failing. On the client run, a baseline file names the auth scenarios. The package has no OAuth client, and those listed scenarios are the accepted failures. Anything outside that list failing causes the job to fail, as does a listed scenario that starts passing. The second rule is the one I care about: when a known failure quietly disappears, the job fails until the baseline is updated. The list cannot go stale without anyone noticing.

This pull request was a follow-up to #491. A pair of example programs proves the package works for one conversation. The conformance suite checks it against the protocol's own definition of correct, every week, without anyone remembering to ask.

## Writing it down: DEVELOPING.md and the README

Code that a contributor cannot navigate does not stay healthy. [PR #673](https://github.com/dart-lang/ai/pull/673) added a `DEVELOPING.md` for the package. It is short and covers what someone needs to work on the package: where the schema files live, the checks CI runs, the SDK the format check needs, the conformance fixtures, and the changelog convention. I named it `DEVELOPING.md` rather than a second `CONTRIBUTING.md`, since the repository root already has one, and the new file links there. The same pull request fixed a stale pointer: the library comment in `api.dart` still referenced the 2025-06-18 schema file, and it now points at the schema directory. This closes issue #20.

[PR #677](https://github.com/dart-lang/ai/pull/677) cleaned up the README after a feature removal. Taking elicitation, sampling and roots out of the server left a readme section describing a call pattern that no longer exists. It now describes answering with an `InputRequiredResult`, and that answer serves every revision. Streamable HTTP also moved from a construction marker to supported in the support table. Neither the handler nor the client channel carries an unfinished piece, and the row's note already names what the revision removed.

Documentation drift is not cosmetic here. A README section describing a removed pattern sends every new reader down a dead end, and a support table with stale markers misstates what the package can do.

## What I would do the same way again

These changes landed over one week: the conformance run on September 15, the README on September 16, pagination, both protocol fixes and `DEVELOPING.md` on September 21, and the client example on September 22. Looking back at them, three choices are the ones I would repeat. New helpers went beside the existing single-page methods instead of replacing them, and no caller had to change a line. The safe behaviour became the default: a 64-page bound that throws, with `null` as an explicit opt-out. And a dependency that is still alpha got a job that shows its failures without gating every pull request, with a baseline checked in both directions. None of this asks a reader to trust anything they cannot run, bound, or see checked on a schedule.

*Correction, 2026-09-23: an earlier version said #684 fixed a status code. It changed the JSON-RPC error code sent with 415, and the status stayed 415.*
