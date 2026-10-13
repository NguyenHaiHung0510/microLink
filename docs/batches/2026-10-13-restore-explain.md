# Restore the Explain view

Owner approved2026-10-13: "duyệt" after T1 proposed restoring complete inline
Explain logs for all1..100 tasks. The Owner corrected "Đối chứng" to "Giải thích".
This is a scoped restoration, not rollback of the independent-lane architecture.

## Scope and acceptance

- Remove the Full-HD rule that hides inline logs for more than3 tasks.
- Give Explain a reading layout: full chronological Agent/Bridge logs under each
  client cell and API receive/commit/replay/response logs under each server cell.
- Keep complete vertical logs without internal scroll caps or last-N truncation.
- Preserve shared real-run data, separate lane state, scenario selection, all
  configuration, fixed black box,1/10-event controls and trace-click neutrality.
- Keep Compare compact and Journey separate. No backend/core/protocol changes.

Implement directly as T1; no delegation or publication. Preserve dirty work.
Record this approval before code changes. Check both views at1920x1080 with a
100-task synthetic run, visible complete inline histories and no horizontal
overflow. Reuse unaffected core/integration evidence; no new network benchmark.

## Status

Approval persisted before implementation. Restoration and maintainer verification complete.
Owner visual acceptance remains distinct from maintainer checks.


## Verification

One100-task no-fault control confirmed100/100 writes per lane. Each of four
inline logs contains300 chronological entries, matching raw Agent/Bridge/API
trace counts. All four remain visible with no height cap/internal scrollbar at
1920x1080; body width has no horizontal overflow. Compare retains100 nodes per
panel and hidden inline logs. Switching views keeps the run/count.

Both lane cursors moved600→590→600 via10-event controls. Clicking an inline entry
at590 preserved the cursor. The source JavaScript and backend are unchanged;
previous policy/integration evidence is reused. This is a UI control, not a fault
benchmark. Raw receipts/screenshot: `.runtime/restore-explain-20261013/`.
Independent QA and projector/device acceptance were NOT RUN. No publication.
