> {#m-zhpt29} USER: "is there a process for refining all those existing @implementation links? For example, we could have a tool that finds top-of-file links, dereferences the spec, and passes the code and spec to an agent and say something like \"narrow this @implements link to just the code that is doing the implementation\""

> {#m-3nym85} USER: "We should support upgrading @tested-by and @checks links too"

> {#m-u45p2k} USER: "Add that functionality. The daisy chaning is the easiest way to get the model to behave properly. IIRC we did that for another concord tool, but I can't recall which"

> {#m-2metp8} USER: "Make the link-refine program say when the file has been been completed (i.e. \"this is the last link in the file, so after this run spec-map\")"

> {#m-p9q3wr} USER: "Also make it so that link-refine can run in parallel. I'd do that by hashing the filenames according to the fanout size, and each agent gets filenames with that hash"

> {#m-9nkadi} USER: "Perhaps encapsulate all of those instructions into a link-refinement agent?"

> {#m-notnpd} USER: "No, it should be using you (this directory) not the globally installed version."

> {#m-gpyaz4} USER: "Hmm. Seems like your sharding was unbalanced. Is there a way to periodically rebalance?"

> {#m-8gir66} USER: "no don't. all the remaining work is in one shard."
