"""Prepare a fresh local-only MixerMates workspace. Never uses the source DB or .env."""
import argparse
import os
from pathlib import Path
import shutil
import sqlite3
import subprocess
import tempfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--directory', type=Path, help='New, nonexistent workspace directory')
parser.add_argument('--mode', choices=['coming_soon','full_platform'], default='coming_soon', help='Safe preview by default; full_platform is isolated fictional regression only')
parser.add_argument('--port', type=int, default=3001)
args = parser.parse_args()
if not 1024 <= args.port <= 65535: parser.error('Use an unprivileged local port.')
source = Path(__file__).resolve().parent.parent
runtime = Path.home()/'.cache/codex-runtimes/codex-primary-runtime/dependencies'
node = shutil.which('node') or str(runtime/'node/bin/node')
pnpm = shutil.which('pnpm') or str(runtime/'bin/fallback/pnpm')
if not Path(node).is_file() or not Path(pnpm).is_file():
    parser.error('Install Node 22 and pnpm locally first; no framework upgrade is required.')
workspace = (args.directory.expanduser().resolve() if args.directory else Path(tempfile.mkdtemp(prefix='mixermates-local-'))/'workspace')
if workspace.exists():
    parser.error('Destination already exists. Choose a new directory; existing files are never reset.')
workspace.mkdir(parents=True)
ignore = shutil.ignore_patterns('node_modules', '.next', '.git', '.local', '.env', '.env.*', '*.db', '*.db-*', '*.tsbuildinfo', 'test-results', 'playwright-report', '__pycache__')
for item in source.iterdir():
    if item.name in ignore(source, [item.name]) or item.name in ['uploads']:
        continue
    if item.is_dir():
        shutil.copytree(item, workspace/item.name, ignore=ignore)
    elif item.is_file():
        shutil.copy2(item, workspace/item.name)
shutil.rmtree(workspace/'public/uploads', ignore_errors=True)
(workspace/'.local').mkdir(mode=0o700)
(workspace/'.local/regression-isolated.json').write_text('{"fictional":true,"phase":3}')
database = workspace/'prisma/audit.db'
# Some local Prisma engines require the empty SQLite file to exist first.
sqlite3.connect(database).close()
url = f'file:{database}'
settings = dict(DATABASE_URL=url, TEST_BASE_URL=f'http://localhost:{args.port}', APP_ORIGIN=f'http://localhost:{args.port}', SITE_MODE=args.mode, TICKET_SALES_MODE='disabled', DEMO_MODE='true' if args.mode=='full_platform' else 'false', LOCAL_CUSTOMER_TEST_ENABLED='true', LOCAL_DEMO_BOOKING_ENABLED='true' if args.mode=='full_platform' else 'false', ISOLATED_TEST_DATA='true', PLATFORM_FEE_BPS='500', HOSTINGER_DATABASE_BOOTSTRAP='false', HOSTINGER_SEED_DEMO='false', NODE_ENV='development')
(workspace/'.env').write_text(''.join(f'{key}="{value}"\n' for key,value in settings.items() if key not in ['TEST_BASE_URL','NODE_ENV']))
env = {k:v for k,v in os.environ.items() if not k.startswith('DB_')}
env.update(settings)
env['PATH'] = str(Path(node).parent)+os.pathsep+env.get('PATH','')
commands = [[pnpm,'install','--frozen-lockfile','--ignore-scripts'],[node,'node_modules/prisma/build/index.js','generate'],[node,'node_modules/prisma/build/index.js','migrate','deploy'],[node,'--import','tsx','prisma/seed.ts'],[node,'scripts/align-halloween-fixture.mjs'],[node,'scripts/align-halloween-phase3.mjs']]
for command in commands:
    completed = subprocess.run(command, cwd=workspace, env=env)
    if completed.returncode:
        raise SystemExit(f'Local preparation stopped (exit {completed.returncode}). Source and production are untouched. Keep {workspace} for diagnosis. Offline install requires the existing pnpm cache.')
print(f'Prepared fictional local workspace: {workspace}')
print('Next: follow docs/LOCAL_DEVELOPMENT.md inside this workspace. No server or deployment was started.')
