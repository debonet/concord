> {#m-ewg9r6} USER: "Yes, graph walk. But we should also prune it so that more distance branches are only included if there's space in the context."
>
>

> {#m-ys83wz} USER: "Or, have 2 tiers: when budget allows, have the detail of the nodes (m,s,t,c) and when it doesn not, just include pointers?"
>
>

> {#m-yzk3ge} USER: "ok, build that tool."
>
>

> {#m-akl3xi} USER: "Hmmm. Problem: how does that intent get written? It should take a string intent-description not an already stored intent."
>
>

> {#m-djixd2} USER: “Can you add that as a generalization step? Tricky because concord does not have model access. I suppose it could return an error if the detail is too sparse, e.g. \"the provided intent is too sparse. Please elaborate so that I can find all relevant materials. Aim for 2-3 complete paragraphs\" or somesuch.”
