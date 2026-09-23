---
layout: post
title: "Run it, bound it, check it every week: how I made a Dart MCP client checkable"
date: 2026-09-23 12:02:58 +0300
tags: ["dart", "model-context-protocol", "open-source", "testing"]
devto_url: "https://dev.to/yusufihsangorgel/making-an-mcp-client-library-checkable-a-runnable-example-bounded-pagination-and-a-weekly-i49"
canonical_url: "https://dev.to/yusufihsangorgel/making-an-mcp-client-library-checkable-a-runnable-example-bounded-pagination-and-a-weekly-i49"
description: "Run the Dart client and server in two commands. List helpers default to a 64-page limit, and the MCP conformance suite runs weekly."
---

*Also published on [dev.to](https://dev.to/yusufihsangorgel/making-an-mcp-client-library-checkable-a-runnable-example-bounded-pagination-and-a-weekly-i49) and [Medium](https://medium.com/@developeryusufihsan/making-an-mcp-client-library-checkable-a-runnable-example-bounded-pagination-and-a-weekly-004f2e5e6524).*

*Disclosure: this article was drafted with AI tools from my own merged pull requests and reviewed before publishing. Every technical claim links to the pull request or file it comes from.*

A protocol library has to connect, list results, stop and follow the spec.

**You should be able to check those promises without taking my word for it.**

Over one week of pull requests to [`package:dart_mcp`](https://pub.dev/packages/dart_mcp), I made three of them checkable:

- **Run it:** a client example that talks to the existing server example.
- **Bound it:** list helpers that walk every page and stop after 64.
- **Check it:** a weekly run against the protocol's own conformance suite.

Start with the client example.

## 1. Run both sides in two terminals

The repository had a server example, `example/streamable_http_server.dart`. It had no client to pair with it.

Its readme suggested a `curl` command. That shows the wire format. It does not show how the Dart client API fits together.

[PR #671](https://github.com/dart-lang/ai/pull/671) added [`example/streamable_http_client.dart`](https://github.com/dart-lang/ai/blob/main/pkgs/dart_mcp/example/streamable_http_client.dart). Start the server, copy the URL it prints, and pass it to the client:

```sh
cd pkgs/dart_mcp
dart run example/streamable_http_server.dart
# Listening on http://127.0.0.1:61009/mcp   (the port changes per run)

dart run example/streamable_http_client.dart http://127.0.0.1:61009/mcp
```

This is the client's output from a run on the current `main`:

```text
connecting to server at http://127.0.0.1:61009/mcp
discovering server
Listing tools from server
Found Tool: greet
Calling `greet` tool
Progress: 1/1: Greeting world
Tool call succeeded: [{text: Hello, world!, type: text}]
```

![The client discovers the server, lists tools, calls greet, receives a progress notification and the result](https://yusufihsangorgel.github.io/assets/img/2026-09-23-mcp-checkable/pair.png)

**The client is 94 lines.** You can read it in one sitting and copy it into a project as a starting point.

## 2. List everything, but stop at 64 pages

MCP list requests page their results. A server returns items and a `nextCursor`. The client sends the cursor back to get the next page.

Before [PR #682](https://github.com/dart-lang/ai/pull/682), the package left that loop to the caller.

Now there are four helpers: `listAllTools`, `listAllResources`, `listAllResourceTemplates` and `listAllPrompts`. Each one returns a `Stream` and yields items as pages arrive.

```dart
// Walks every page. Throws a StateError if page 64 still has a cursor.
await for (final tool in server.listAllTools()) {
  print(tool.name);
}

// Trust the server? Lift the bound explicitly.
final everything = await server.listAllTools(maxPageCount: null).toList();
```

**A server that never stops paging should not trap your walk.**

A server that hands out a cursor on every page keeps a naive `while (cursor != null)` loop running forever. By default the helpers stop. When a 64th page still ends in a cursor, they throw a `StateError`.

![The walk requests a page, yields its items, ends on a null cursor, and throws after 64 pages](https://yusufihsangorgel.github.io/assets/img/2026-09-23-mcp-checkable/pages.png)

The pull request only adds code to `client.dart`: 120 lines added, none removed. The single-page methods are untouched. Existing callers keep their exact behaviour.

The [tests](https://github.com/dart-lang/ai/blob/main/pkgs/dart_mcp/test/client/pagination_test.dart) pin the edges a real server can hit:

- an empty string `nextCursor` is a cursor, not the end;
- an empty page in the middle does not end the walk;
- the first page yields before the second page is requested;
- `maxPageCount` stops a server that alternates two cursors.

## 3. Sampling content as a list, and the error inside a 415

**Sampling content can be one block or a list.** In the schema, `SamplingMessage.content` and `CreateMessageResult.content` take one block or an array of blocks. The old getter cast straight to one block, and a list on the wire threw.

[PR #685](https://github.com/dart-lang/ai/pull/685) changed the getter's type:

```diff
-  SamplingMessageContentBlock get content =>
-      _value[Keys.content] as SamplingMessageContentBlock;
+  List<SamplingMessageContentBlock> get content {
```

One block now reads as a one-element list. On the way out, a single block still goes on the wire as that block.

**A 415 now carries the right error code.** [PR #684](https://github.com/dart-lang/ai/pull/684) did not change the HTTP status. It changed the JSON-RPC error inside the response:

```diff
       HttpStatus.unsupportedMediaType,
       RpcException(
-        McpErrorCodes.headerMismatch,
+        error_code.INVALID_REQUEST,
         'The request body must be sent as ${ContentType.json.mimeType}',
```

The schema binds `HeaderMismatch` to `400 Bad Request`. `Content-Type` is not one of the headers the specification requires. An oversized body already got a generic invalid request error with its own 413, and this branch now matches it.

## 4. Run conformance weekly and catch stale expected failures

[PR #675](https://github.com/dart-lang/ai/pull/675) added a [workflow](https://github.com/dart-lang/ai/blob/main/.github/workflows/conformance.yaml) that runs the MCP conformance suite against both fixtures under `tool/`:

```yaml
on:
  pull_request:
    paths:
      - 'pkgs/dart_mcp/**'
  schedule:
    - cron: '0 0 * * 0' # weekly
  workflow_dispatch:

jobs:
  conformance:
    continue-on-error: true
```

The suite is still an alpha npm package, pinned to `0.2.0-alpha.11`. With `continue-on-error`, the job still reports a failure, but the workflow run stays green.

According to the pull request, every scored 2026-07-28 scenario passed on the server run, and the `tasks` extension was the only failure.

The client run reads a [baseline of expected failures](https://github.com/dart-lang/ai/blob/main/pkgs/dart_mcp/tool/conformance_expected_failures.yaml). The package has no OAuth client yet. The file lists the auth scenarios. [PR #681](https://github.com/dart-lang/ai/pull/681) later gave the client step a timeout.

**The baseline is checked in both directions.**

![A failing listed scenario is fine; a failing unlisted one fails the job; a passing listed one also fails the job](https://yusufihsangorgel.github.io/assets/img/2026-09-23-mcp-checkable/baseline.png)

A listed scenario that starts passing also fails the job. When OAuth support lands, the list has to shrink with it. A stale entry shows up as a failing job.

## 5. Docs that match the code

[PR #673](https://github.com/dart-lang/ai/pull/673) added a [`DEVELOPING.md`](https://github.com/dart-lang/ai/blob/main/pkgs/dart_mcp/DEVELOPING.md) for the package. It covers the schema files, the checks CI runs, the conformance fixtures and the changelog convention.

[PR #677](https://github.com/dart-lang/ai/pull/677) cleaned up the README after elicitation, sampling and roots came out of the server. A section still described a call pattern that no longer existed. It now describes answering with an `InputRequiredResult`, and Streamable HTTP is marked supported in the support table.

## What I would do the same way again

- **Add helpers beside old methods, not over them.** No existing call to a single-page list method had to change.
- **Make the safe behaviour the default.** A 64-page bound that throws, with `null` as the explicit way out.
- **Let an alpha dependency report, not gate.** Its failures stay visible without turning the run red.

Run the example, read the pagination tests, and open the conformance workflow.

*Correction, 2026-09-23: an earlier version said #684 fixed a status code. It changed the JSON-RPC error code sent with 415, and the status stayed 415.*
