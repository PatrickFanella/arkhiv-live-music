# Contributing

Lineage is a React/TypeScript frontend on SUBCULT's shared archive engine. Keep changes small and reviewable. Backend changes belong in the engine's repository; see [AGENTS.md](AGENTS.md).

## Development flow

1. Create or pick an issue before making non-trivial changes.
2. Create a branch from `main`.
3. Make the smallest change that satisfies the issue.
4. Run verification:

   ```bash
   make verify
   ```

5. Open a pull request using the PR template.
6. Link the issue with `Closes #N` when appropriate.

## Commit style

Prefer concise conventional-style subjects:

```text
feat: sort and filter the recordings table
docs: update Open Pilot guidance
fix(web): keep artist page text inside narrow screens
chore: refresh dependencies
```

## Open Pilot issues

Use the draft task, bug, feature, or documentation form to prepare work. Each form requires a goal, context, acceptance criteria, and a deterministic test command.

The portable pickup contract uses:

- `ready-for-agent`
- `agent:queued`
- a deterministic `Test Command`

Draft forms add `status:needs-review` and do not opt into pickup. After review, apply both pickup labels or use the ready-for-pickup form, which applies them at submission. A deployment may accept `ready-for-agent` alone or assignment to `open-pilot`; neither should be used for unfinished work.

Good Open Pilot tasks are:

- one focused outcome
- clear context and constraints
- explicit out-of-scope notes
- verifiable from the repository root

## Verification commands

Use the narrowest deterministic command that proves the change.

Default full check:

```bash
make verify
```

Narrower examples:

```bash
pnpm --dir web run test
pnpm --dir web run typecheck
make compose-config
```
