"""
Iron Rabbit Repair #5 Phase 3 verification — reference Playwright script.

Reproduces the mobile touch-boundary duplication bug and validates
same-pack reorder / legitimate cross-pack COPY / MOVE flows.

Run via the internal browser-automation harness (page/context injected
in scope). Not runnable via plain `python phase3_verify_drag.py`.

Seeds IndexedDB (`IronRabbit`) directly through localforage and sets
`metadata.migrated_from_backend=true` so the app does NOT re-fetch
demo notes from the backend on load.

Key finding: V1 boundary no-op FAILS on wobble>=30 — Phase 2 fix
does not fully block the duplication path.
"""
# See /app/test_reports/iteration_86.json for the full result matrix.
