SHELL := /usr/bin/env bash
.DEFAULT_GOAL := help
.NOTPARALLEL: verify

.PHONY: help verify deps typecheck lint test build compose-config open-pilot-check

help: ## Show available commands
	@awk 'BEGIN {FS = ":.*##"; printf "Commands:\n"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

deps: ## Install locked dependencies
	pnpm --dir web install --frozen-lockfile

verify: deps typecheck lint test build compose-config open-pilot-check core-pin-check ## Run all checks

lint: ## Run static analysis
	pnpm --dir web run lint

test: ## Run tests without watch mode
	pnpm --dir web run test

build: ## Build application artifacts
	pnpm --dir web run build

compose-config: ## Validate local Compose configuration
	docker compose --env-file deploy/archive-core.env config --quiet

open-pilot-check: ## Check all issue forms and label definitions
	@set -e; for form in task bug feature docs ready; do \
		test -f .gitea/ISSUE_TEMPLATE/open-pilot-$$form.yaml; \
		grep -q 'Test Command' .gitea/ISSUE_TEMPLATE/open-pilot-$$form.yaml; \
	done
	@grep -q 'status:needs-review' .gitea/ISSUE_TEMPLATE/open-pilot-task.yaml
	@! grep -Eq '^ *- ready-for-agent$$|^ *- agent:queued$$' .gitea/ISSUE_TEMPLATE/open-pilot-task.yaml
	@grep -q 'agent:queued' .gitea/ISSUE_TEMPLATE/open-pilot-ready.yaml
	@test -f docs/reference/open-pilot-labels.yaml

typecheck: ## Check frontend TypeScript types
	pnpm --dir web run typecheck

.PHONY: compose-build
compose-build: ## Build local container images without starting services
	docker compose --env-file deploy/archive-core.env build

.PHONY: core-pin-check
core-pin-check: ## Check shared dependency pins
	python3 scripts/check_dependencies.py
