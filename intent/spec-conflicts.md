> {#m-5449jo} USER 2026-11-10: "How could we detect those? seems like an n^2 problem on the face of it"
>

> {#m-9pigsq} USER 2026-11-10: "Try making it"
>

> {#m-vcbbyq} USER 2026-11-10: "agreed, but the challenge is how do we reduce the comparison set for each spec, so that we are looking at O(nm) instead of O(n^2) with m<<n"
>

> {#m-0wens7} USER 2026-11-10: "ok, build this version. Then test it on this codebase and let's see how many hits we get."
>

> {#m-5kab8v} USER 2026-11-10: "Add some structure by default that will help agents figure out what do to with that info, and a --human flag which makes it less structured.

> {#m-2875ig} USER 2026-11-11: "Right. Add that. And call it --nextreview. We should also provide a --nextopen so that the model can chug through all the open conflicts and resolve them. Then add documentation for all of this so agents know how to use it."
>

> {#m-twjhsf} USER 2026-11-11: "This is less than ideal. We need some way to go on to the next one. Do we need to use dates? Show me the open one that was examined least recently?"
>

> {#m-daisy1} USER 2026-11-12: "yes, that is right. But is there a way to encapsulate that loop so that we don't need to rely on the model to loop properly? Perhaps the tools should issue daisy-chain-like instructions, e.g.

> {#m-brnch1} USER 2026-11-12: "But the launch of branches is controlled by the harness so we need to **advise** the model calling spec-conflicts to handle it that way"
>

> {#m-rvw001} USER 2026-11-12: "Ok, so do it that way. Produce a conflict-reviewer agent and tell the model to run that agent for each conflict"
>

> {#m-qloop1} USER 2026-11-12: "This is not working well.

> {#m-hour01} USER 2026-11-12: "You've got to do something to handle agents that die without reponding.

> {#m-docno1} USER 2026-11-12: "When you're done make sure there's a comprehensive set of docs for how to do a conflict review:

> {#m-remn01} USER 2026-11-12: "we can do a little better than a while loop: --nextreview can return the remaining count and the conflict-reviewer can return that count to the calling model and say there are likely additional conflicts to review so launch me again, or not"
>

> {#m-count1} USER 2026-11-12: "OOOOh. The report should not display anything but the count! We don't want to pollute the context!"
