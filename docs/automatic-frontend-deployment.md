# Automatic frontend deployment

The GitHub Actions `PR CI` workflow runs the full consumer verification and
Compose build on pull requests. On main pushes and manual main dispatch, the
`Deploy` workflow (`.github/workflows/deploy.yml`) joins the tailnet, builds and
validates the frontend image and deploys that exact image to the existing Dozor
`lineage-web` container, Compose service `web`. The receiver deploys only the
revision that is current on the Gitea copy of main, so the job waits for the
GitHub-to-Gitea copy. The Gitea `template-check` workflow only verifies. The backend stays on its reviewed
immutable Arkhiv core pin; metadata workers, PostgreSQL and media volumes keep
their independent release and preservation procedures.

The host profile retains Lineage's existing host networking and read-only nginx
configuration: the existing LAN listener on `10.0.0.57:3041` and loopback API
upstream at `127.0.0.1:28347`.
The image's development nginx proxy uses Docker DNS. CI runs its nginx syntax
check with networking disabled; deployment retains the production config bind.

CI uses this app's `HOMELAB_DEPLOY_KEY` and pinned `HOMELAB_KNOWN_HOSTS`, with
an explicit SSH config and connection reuse disabled. The private fleet-deploy
receiver permits only this repository/service and the current main revision.
It activates a reviewed frontend-only Compose baseline, refuses runtime drift,
checks image/configuration/health and public HTML, and restores the prior image
on failed readiness. Private host receipts keep exact image IDs and rollback
commands. A main retry reuses an already accepted image instead of rebuilding
or replacing it; PRs continue to build normally.

The homelab operator owns the key; its initial rotation deadline is 2027-02-03.
Register and test the local profile/key before merge. No new listener, route,
media acquisition or shared-engine upgrade is part of this frontend rollout.
Deployment/HTML delivery does not by itself qualify every recording's playback.
