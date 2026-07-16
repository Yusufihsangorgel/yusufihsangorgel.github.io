---
layout: post
title: "AI agents fail for the same boring reasons job queues do"
date: 2026-07-13 03:51:01 +0300
tags: ["golang", "programming", "distributed-systems", "ai-agent", "software-engineering"]
medium_url: "https://medium.com/@developeryusufihsan/ai-agents-fail-for-the-same-boring-reasons-job-queues-do-5fb58fccb86d"
canonical_url: "https://medium.com/@developeryusufihsan/ai-agents-fail-for-the-same-boring-reasons-job-queues-do-5fb58fccb86d"
description: "Retries, idempotency, dead letters — the model usually isn’t the part that breaks."
---

<p><em>Also published on <a href="https://medium.com/@developeryusufihsan/ai-agents-fail-for-the-same-boring-reasons-job-queues-do-5fb58fccb86d">Medium</a>.</em></p>

<p>Retries, idempotency, dead letters — the model usually isn’t the part that breaks.</p>

<p>A team ships an agent. It works in the demo. Three weeks into production it has emailed the same customer four times, marked one order shipped twice, and then quietly done nothing at all for six hours on a Tuesday. Nobody touched the model. Nobody touched the prompt.</p>

<p>I’ve watched this exact shape of failure for years — not in agents, in job queues. The mailer that sent twice. The webhook that fired again on retry. The one worker that wedged on a bad message and dragged the whole queue down with it. Different decade, same bugs.</p>

<p>An agent that calls tools over a network, retries when they fail, and carries state between steps is a distributed system. We’ve known how these break for a long time, and the fixes have names. They’re just not the names people reach for while they’re staring at an LLM.</p>

<h3>The math nobody puts on the slide</h3>

<p>Start with why a multi-step agent feels so much flakier than the model’s benchmark score.</p>

<p>Kapoor and Narayanan — the Princeton researchers behind AI Snake Oil — have a paper, “Towards a Science of AI Agent Reliability,” that makes the point without any drama. Benchmarks report average accuracy. Deployment needs reliability, which is a different number. Their worked example is a three-step chain at 90%, 85%, and 97%. Multiply it out and you get 74% end to end. One run in four is wrong somewhere.</p>

<p>That’s three steps. Real agents chain ten or twenty tool calls. You don’t need bad steps to get a bad agent — you just need enough ordinary ones. And here’s the part that matters if you’re the one on call: at 74%, paying for a better model to move one step from 90% to 92% barely moves the product. The loss isn’t sitting inside the model. It’s spread across every hop between the steps.</p>

<p>Gartner has been telling executives a blunter version of this — that they expect more than 40% of agentic AI projects to be scrapped by 2027. Not because the models can’t. Because the systems around them don’t hold.</p>

<p>So stop staring at the model for a minute. Look at the hops.</p>

<h3>The failure modes, and their older names</h3>

<p>A retry that wasn’t safe to retry. A tool call times out, so the agent retries it. But the first call actually went through — the timeout was on the response coming back, not on the request going out. Now the refund has happened twice. In queue land this is the oldest bug there is, and the fix is dull: idempotency keys. Every side-effecting action carries a key that the downstream deduplicates on. The agent can retry as much as it likes; the second “issue refund R-4471” is a no-op.</p>

<p>“At least once” meeting “but it ran twice.” Any durable step delivery you didn’t build yourself is almost certainly at-least-once, not exactly-once. That’s a feature — exactly-once over a network is mostly a story we tell juniors. You make it safe the same way: dedupe on a key you control, and make the write idempotent instead of hoping the delivery is.</p>

<p>Work that vanishes mid-step. The agent decides to do three things, does one, and the process dies. Nothing anywhere recorded that the other two were still owed. This is what the outbox pattern is for: you write the intent to do the work in the same transaction as the thing that triggered it, and a worker drains it afterwards. Durable steps, not hopeful ones.</p>

<p>The poison step. One tool input the agent can’t get past. It retries, fails, retries, fails — forever, burning tokens and rate limit the whole time. Queues answer this with a dead-letter queue: after N attempts you move the thing aside so it stops taking everyone else down with it, and so a human can actually look at it. (I got tired of redriving those by hand and ended up writing a small tool for it. The point isn’t the tool — it’s that “set it aside and make it visible” beats “retry until the bill arrives.”)</p>

<p>Hanging calls and rate limits. A big share of real production LLM errors aren’t wrong answers — they’re capacity: timeouts and rate limits. The instinct is to retry immediately, which is exactly how you turn one rate-limit blip into a retry storm that keeps you rate-limited. Deadlines on every call, backoff on every retry, and a queue in front so load has somewhere to wait instead of pounding the door.</p>

<h3>One concrete piece</h3>

<p>Idempotency is the one I’d reach for first, because it makes every other retry safe. Here’s the whole idea in Go — the store is anything durable you already run, Postgres or Redis:</p>

<pre>type Store interface {<br>    // Result returns the saved result for key, or false if the key is new.<br>    Result(ctx context.Context, key string) (json.RawMessage, bool, error)<br>    Save(ctx context.Context, key string, result json.RawMessage) error<br>}<br><br>// Idempotent wraps a side-effecting tool call so a retry can&#39;t run it twice.<br>func Idempotent(ctx context.Context, s Store, key string,<br>    do func() (json.RawMessage, error)) (json.RawMessage, error) {<br><br>    if out, ok, err := s.Result(ctx, key); err != nil {<br>        return nil, err<br>    } else if ok {<br>        return out, nil // already ran, hand back the first result<br>    }<br><br>    out, err := do()<br>    if err != nil {<br>        return nil, err // failed cleanly: nothing saved, safe to try again later<br>    }<br>    return out, s.Save(ctx, key, out)<br>}<br></pre>

<figure><img alt="" src="https://cdn-images-1.medium.com/max/1024/1*ssWeIlRKuBLxU_ajfLEBZQ.png" /><figcaption>A retried refund that only runs once — the key, not the network, makes it safe.</figcaption></figure>

<p>The trick is entirely in the key. It has to come from the intent — the order id plus “refund”, a hash of the tool name and arguments — never from something that changes per attempt. Let the model generate a fresh key each retry and you’ve built nothing.</p>

<p>And the honest caveat, because it bites people: the version above still has a race. Two attempts fire at once, both read “new,” both run. In real life Save is an insert against a unique constraint, and the second one loses and reads back the winner’s result. If a snippet like this ever ships without that, it’s decoration.</p>

<h3>What it actually buys you</h3>

<p>None of this makes the model any smarter. That’s the whole point. It makes the agent’s failures boring and recoverable instead of surprising and permanent. A retried step is safe. A dead step is visible. A dropped step comes back on its own.</p>

<p>The uncomfortable version: a lot of what gets called “agent reliability” in 2026 is backend engineering we already knew how to do, pointed at a new caller that happens to be an LLM. The genuinely new research is real — knowing when an agent is unsure enough to stop and ask is not a solved problem. But the thing keeping your agent out of production this quarter is probably a missing idempotency key, not the model.</p>

<p>Treat the agent like the distributed system it already is, and most of the drama goes away. It just stops being about AI, which is maybe why nobody wants to write it on the slide.</p>
