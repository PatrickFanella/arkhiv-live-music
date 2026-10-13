SHELL := /usr/bin/env bash
.DEFAULT_GOAL := help
.NOTPARALLEL: verify

.PHONY: help verify deps fmt typecheck lint test build compose-config open-pilot-check

help: ## Show available commands
	@awk 'BEGIN {FS = ":.*##"; printf "Commands:\n"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

deps: ## Install locked dependencies
	pnpm --dir web install --frozen-lockfile

verify: deps fmt-check typecheck lint test build compose-config open-pilot-check ## Run all checks

fmt: ## Format source files
	@git ls-files -z --cached --others --exclude-standard 'backend/*.go' | xargs -0 -r gofmt -w

lint: ## Run static analysis
	cd backend && go vet ./...
	pnpm --dir web run lint

test: ## Run tests without watch mode
	cd backend && go test ./...
	pnpm --dir web run test

build: ## Build application artifacts
	cd backend && go build -o bin/app ./cmd/app
	pnpm --dir web run build

compose-config: ## Validate local Compose configuration
	docker compose config --quiet

open-pilot-check: ## Check all issue forms and label definitions
	@set -e; for form in task bug feature docs ready; do \
		test -f .gitea/ISSUE_TEMPLATE/open-pilot-$$form.yaml; \
		grep -q 'Test Command' .gitea/ISSUE_TEMPLATE/open-pilot-$$form.yaml; \
	done
	@grep -q 'status:needs-review' .gitea/ISSUE_TEMPLATE/open-pilot-task.yaml
	@! grep -Eq '^ *- ready-for-agent$$|^ *- agent:queued$$' .gitea/ISSUE_TEMPLATE/open-pilot-task.yaml
	@grep -q 'agent:queued' .gitea/ISSUE_TEMPLATE/open-pilot-ready.yaml
	@test -f docs/reference/open-pilot-labels.yaml

.PHONY: fmt-check
fmt-check: ## Check formatting without changing sources
	@set -e; unformatted=$$(git ls-files -z --cached --others --exclude-standard 'backend/*.go' | xargs -0 -r gofmt -l); \
	if [ -n "$$unformatted" ]; then printf '%s\n' "$$unformatted"; exit 1; fi

typecheck: ## Check frontend TypeScript types
	pnpm --dir web run typecheck

.PHONY: compose-build
compose-build: ## Build local container images without starting services
	docker compose build
