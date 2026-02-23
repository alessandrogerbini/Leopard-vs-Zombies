On Reducing Context Utilization

Every context insertion must declare: purpose, scope, expiration condition.

No agent may infer missing state; absence must remain explicit.

High-token cognition is reserved for irreversible decisions only.

All state must be normalized to a canonical schema before storage or retrieval.

Context must be evicted proactively, not just avoided.

Never store long-lived information in the prompt if it can be stored externally and retrieved conditionally.

No conversational history may persist unless compressed to a decision-level summary.

Context may only be introduced when a downstream operation explicitly requires it.

No single agent may reason, plan, remember, and code simultaneously.

Treat context tokens as a hard budgeted resource.

Whenever possible, store state in machine-readable form, not prose.

Reasoning traces must never be persisted unless strictly necessary.

Failed hypotheses, discarded plans, and rejected code must not persist unless explicitly promoted.
