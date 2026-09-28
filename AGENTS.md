# AI Contributor Handoff Protocol

These instructions apply to every AI agent working anywhere in this repository.

## Before starting work

1. Read this file, [`docs/AI_WORK_LOG.md`](docs/AI_WORK_LOG.md), the canonical [`docs/prd.md`](docs/prd.md), and the implementation plan relevant to the requested scope.
2. Inspect `git status`, recent commits, and the files you will change. Do not overwrite or misattribute existing work.
3. Use the PRD for canonical product intent and Current/Target status. Use roadmap/plan task statuses for delivery tracking.

## Required working and handoff behavior

- After each coherent completed unit, and always before handing off, add a new entry at the top of the entries section in `docs/AI_WORK_LOG.md` using its fixed template.
- The log is append-only: never rewrite, reorder, or delete prior entries. Corrections and reversions require a new entry that references the earlier one.
- Do not mark work `Completed` without reproducible evidence. Use `Partial` when useful work remains, `Blocked` when progress cannot continue, and `Reverted` when prior work was undone. State the exact remaining work or blocker.
- Label claims explicitly as **Current** (verified repository state), **Target** (intended/proposed state), or **Assumption** (unverified). Never promote Target or Assumption to Current without evidence.
- When work affects a task tracked in a roadmap or plan, update that canonical task status and evidence there when applicable. The work log complements those statuses; it does not replace them.
- Record requirement/task IDs when known, files changed, decisions and assumptions, validation commands/results, and an exact next action. Keep entries compact; link to canonical documents instead of duplicating project summaries.
- Record branch, commit, and push state truthfully. Never claim a commit or push occurred unless verified. If none occurred, say `Commit: none; Push: none` and report the actual branch/working-tree state.
- For partial or blocked work, preserve valid changes, identify unfinished files/tasks and failed validation, and give the next agent a concrete restart command or edit.

## Completion checklist

- [ ] Requested scope is complete, or partial/blocked status is explicit.
- [ ] Current/Target/Assumption claims are separated.
- [ ] Relevant plan status/evidence is updated when applicable.
- [ ] Validation evidence and changed files are recorded.
- [ ] Commit, branch, push, and working-tree state are truthful.
- [ ] A newest-first entry is added to `docs/AI_WORK_LOG.md` before handoff.
