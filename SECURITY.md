# Security Policy

## Supported scope

This policy covers the Lineage web app and the deployment configuration in this repository, as served at https://lineage.subcult.tv/. The catalog and search API come from SUBCULT's shared archive engine.

## Reporting a vulnerability

Do not publish sensitive vulnerabilities in public issues.

Report privately through [GitHub private vulnerability reporting](https://github.com/subculture-collective/lineage/security/advisories/new).

Include:

- affected repository and commit
- impact summary
- reproduction steps
- affected configuration or deployment path
- suggested mitigation, if known

## Secret handling

Never commit:

- `.env` or `.env.*` files, except `.env.example`
- API tokens or OAuth secrets
- SSH keys or deploy keys
- database dumps containing real data
- private certificates or signing keys
- webhook secrets

Use placeholders in docs and examples. Report only secret key names and presence, never secret values.

## Dependency and supply-chain hygiene

This repository should:

- commit `web/pnpm-lock.yaml`
- pin container base images deliberately
- document update procedures
- run dependency and container scans where appropriate
- keep generated caches out of git

## Open Pilot safety

Open Pilot tasks should include a deterministic `Test Command` and clear scope limits. Do not queue tasks that require secret access, production credentials, destructive data changes, or ambiguous deployment actions.

For risky work, require human review before adding `agent:queued`.
