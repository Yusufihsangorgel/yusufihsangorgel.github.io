---
layout: post
title: "The HTTP support that wasn’t about HTTP"
date: 2026-07-16 19:01:56 +0300
tags: ["flutter", "model-context-protocol", "open-source", "dart", "programming"]
medium_url: "https://medium.com/@developeryusufihsan/the-http-support-that-wasnt-about-http-8bdd966d4943"
canonical_url: "https://medium.com/@developeryusufihsan/the-http-support-that-wasnt-about-http-8bdd966d4943"
description: "SEP-2575 removes initialize. In package:dart_mcp, that was where servers set themselves up."
---

<p><em>Also published on <a href="https://medium.com/@developeryusufihsan/the-http-support-that-wasnt-about-http-8bdd966d4943">Medium</a>.</em></p>

<p><em>SEP-2575 removes </em><em>initialize. In package:dart_mcp, that was where servers set themselves up.</em></p>

<p>Every MCP session to date has opened the same way: the client sends initialize, the server answers with its capabilities, the client acknowledges with initialized, and only then does real work start. The <a href="https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/">2026-07-28 release candidate</a> deletes all of it. <a href="https://modelcontextprotocol.io/seps/2575-stateless-mcp">SEP-2575</a>, titled “Make MCP Stateless”, removes the initialize request, the initialized notification, and the protocol-level session they created. Protocol version, client info, and client capabilities ride along on every request instead, and server/discover replaces the handshake as the way clients learn what a server offers.</p>

<p>If you deploy agents, this is mostly good news. A stateless MCP server is just an HTTP endpoint: no session to pin, and any replica can answer any request.</p>

<figure><img alt="In the 2026 stateless MCP model, a client fires independent requests, each carrying protocol version, clientInfo and capabilities; any per-request server instance can answer. initialize, initialized and Mcp-Session-Id are gone." src="https://cdn-images-1.medium.com/max/1024/1*IvSA4bwOLJrZA5qsfVl3wQ.png" /></figure>

<p>If you maintain an SDK, it’s a different kind of news. I’ve been working toward Streamable HTTP support in <a href="https://github.com/dart-lang/ai/tree/main/pkgs/dart_mcp">package:dart_mcp</a>, the Dart team’s MCP SDK, and I scoped it in my head as a transport task. Add an HTTP channel next to the existing stdio one, wire it into the same server class, done. That plan didn’t survive a read of the server code. In this SDK the handshake carried more than the wire exchange: it was the place where a server set itself up. The new spec deletes that place.</p>

<h3>Where the setup actually lived</h3>

<p>Here is the old shape. MCPServer.initialize handles the handshake request: it negotiates the protocol version and stores the client’s capabilities. And because it’s the one method guaranteed to run exactly once, before anything else, every feature mixin — tools, resources, prompts, logging — overrides it to register its request handlers and advertise what it supports:</p>

<pre>FutureOr&lt;InitializeResult&gt; initialize(InitializeRequest request) {<br>  // negotiate protocol version, store client capabilities;<br>  // mixins override this to register handlers and edit capabilities<br>}</pre>

<p>This is a reasonable design when every connection starts with a handshake. Registration needs a home, and “the first thing that runs on every connection” is a good one. But in the 2026 model, each HTTP request is its own world. The server object answering it may exist for exactly that one request. There’s no connection to initialize, because there’s no connection.</p>

<p>So the first slice of “add HTTP” wasn’t HTTP at all. It was separating feature registration from wire negotiation, so setup can run whether the trigger is a legacy handshake or a bare request arriving with all its metadata attached.</p>

<h3>The seam</h3>

<p>That split is <a href="https://github.com/dart-lang/ai/pull/524">dart-lang/ai#524</a>, merged by jakemac53 on July 15. The old entry point becomes two:</p>

<pre>/// Reusable feature and capability registration, for either lifecycle.<br>FutureOr&lt;ServerCapabilities&gt; initialize(MCPServerInitialization initialization);</pre>

<pre>/// The legacy wire handshake only. Calls initialize() internally.<br>FutureOr&lt;InitializeResult&gt; initializeLegacy(InitializeRequest request);</pre>

<p>initialize now takes an MCPServerInitialization: protocol version, client info, and client capabilities as plain values, with no opinion about where they came from. In legacy mode, initializeLegacy speaks the old handshake on the wire and calls the hook once per connection. In the stateless model, a request-scoped dispatcher will call the same hook once per request, filled from that request’s own metadata. One hook, two callers. The built-in mixins and the examples all moved to it, and the legacy path speaks the same wire protocol as before, so existing servers keep working untouched.</p>

<figure><img alt="One initialize(MCPServerInitialization) hook is called by two callers: initializeLegacy (wire handshake, per connection) and a request-scoped dispatcher (2026 model, per request). The hook registers tools, resources, prompts and logging." src="https://cdn-images-1.medium.com/max/1024/1*JQMeW8VYuosTKsxSelWyvw.png" /></figure>

<p>Scope, stated plainly: this PR does not add HTTP. It’s the seam that lets HTTP land later without rewriting every mixin a second time.</p>

<p>That’s the design. The design was maybe a third of the work. Take initialized — the future downstream code awaits to know setup has finished. It now has to complete in both modes, even though “finished” means once per connection in one and once per request in the other. And one commit had to go the other way: the team’s production MCP server was reverted back onto the released 0.5 line, on the maintainer’s call, so its releases wouldn’t be blocked on an API still in flux.</p>

<p>The spec didn’t hold still either. The day after the merge, <a href="https://github.com/modelcontextprotocol/modelcontextprotocol/pull/3002">modelcontextprotocol#3002</a> changed one of the values the seam carries: per-request clientInfo is now optional. #524 merged July 15; #3002 merged July 16. The RC will move again before it ships on the 28th, so the seam has to leave room for that rather than hard-code today’s draft.</p>

<h3>One question before any code</h3>

<p>This was a breaking change to a Google-maintained package, proposed by an outside contributor. Before writing anything I asked the maintainers which spec version this should target. The answer — the 2026 RC first — is what turned the work from a transport add-on into a lifecycle split. Had I skipped that question, I’d have built HTTP support around a handshake that’s about to not exist.</p>

<p>The other thing I’d repeat: ship the smallest slice that unblocks the next one, and say out loud what it doesn’t do. A PR that admits its own limits is easier to review.</p>

<p>What’s left is sequenced on the tracking issue, <a href="https://github.com/dart-lang/ai/issues/162">dart-lang/ai#162</a>: the request-scoped dispatcher, then Streamable HTTP itself, then conformance testing (<a href="https://github.com/dart-lang/ai/issues/491">dart-lang/ai#491</a>). The handshake had one job beyond the wire — telling the server when to set itself up. That job now has its own name in the API. The rest builds on it.</p>
