"""Check the consumer's immutable shared-engine and viewer provenance."""
import json
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
core = json.loads((root / 'deploy/core-release.json').read_text())
viewer = json.loads((root / 'deploy/viewer-release.json').read_text())
package = json.loads((root / 'web/package.json').read_text())
if core['artifact_kind'] != 'core' or not re.fullmatch(r'git.subcult.tv/subculture-collective/archive-core@sha256:[0-9a-f]{64}', core['engine_digest']):
    raise SystemExit('Expected an immutable shared Arkhiv engine pin')
if (root / 'deploy/archive-core.env').read_text() != 'ARCHIVE_ENGINE_IMAGE=' + core['engine_digest'] + '\n':
    raise SystemExit('Engine pin and release receipt disagree')
if package['dependencies'].get(viewer['package']) != viewer['version']:
    raise SystemExit('Viewer package and release receipt disagree')
print('Shared pins verified: core', core['version'], 'viewer', viewer['version'])
required = json.loads((root / 'deploy/required-modules.json').read_text())
missing = [key for key, version in required.items() if core['modules'].get(key) != version]
if missing:
    raise SystemExit('Published engine lacks required modules: ' + ', '.join(missing))
