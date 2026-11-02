"""Owned Phase 10/11 fictional SQLite recovery only. Never accepts a hosted/canonical database."""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import sqlite3
from datetime import datetime, timezone


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def guarded_workspace(path):
    workspace = Path(path).resolve(strict=True)
    parents = {Path.home() / f'.codex/tmp/mixermates-phase{phase}-20261027': phase for phase in [10, 11]}
    phase = parents.get(workspace.parent)
    if phase is None:
        marker = workspace / '.local/regression-isolated.json'
        if workspace.name in ['baseline','EVENT FINDER'] or not marker.is_file() or json.loads(marker.read_text()) != {'fictional': True, 'phase': 3} or os.environ.get('ISOLATED_TEST_DATA') != 'true' or os.environ.get('DATABASE_URL') != 'file:' + str(workspace / 'prisma/audit.db'):
            raise ValueError('Explicit disposable fictional workspace required.')
    else:
        marker = workspace / f'.local/phase{phase}-isolated.json'
        if workspace.name == 'baseline' or not marker.is_file() or json.loads(marker.read_text()) != {'fictional': True, 'phase': phase}:
            raise ValueError('Missing explicit fictional workspace marker.')
    if any(key.startswith('DB_') for key in os.environ):
        raise ValueError('Clear all DB_* overrides before local recovery.')
    return workspace


def within(workspace, path, existing=True):
    candidate = Path(path).resolve(strict=existing)
    if not candidate.is_relative_to(workspace) or candidate == workspace:
        raise ValueError('Recovery paths must remain inside the calling workspace.')
    return candidate


def fingerprint(connection):
    integrity = [row[0] for row in connection.execute('PRAGMA integrity_check')]
    foreign_keys = connection.execute('PRAGMA foreign_key_check').fetchall()
    if integrity != ['ok'] or foreign_keys:
        raise ValueError('Database integrity/foreign-key verification failed.')
    tables = {}
    schema = connection.execute("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").fetchall()
    for name, _ in schema:
        quoted = '"' + name.replace('"', '""') + '"'
        rows = connection.execute('SELECT * FROM ' + quoted).fetchall()
        def encode(row):
            return json.dumps([{'bytes': base64.b64encode(v).decode()} if isinstance(v, bytes) else v for v in row], separators=(',', ':'), ensure_ascii=True)
        payload = '\n'.join(sorted(encode(row) for row in rows)).encode()
        tables[name] = {'rows': len(rows), 'sha256': hashlib.sha256(payload).hexdigest()}
    migrations = [list(row) for row in connection.execute('SELECT migration_name, checksum, finished_at IS NOT NULL, rolled_back_at IS NOT NULL FROM _prisma_migrations ORDER BY migration_name')] if '_prisma_migrations' in tables else []
    return {'integrity': 'ok', 'foreignKeyViolations': 0, 'schemaSha256': hashlib.sha256(json.dumps(schema).encode()).hexdigest(), 'migrations': migrations, 'tables': tables}


def readonly(path):
    return sqlite3.connect(path.as_uri() + '?mode=ro', uri=True)


def backup(workspace, source, destination):
    source = within(workspace, source)
    destination = within(workspace, destination, False)
    if not source.is_file() or any(Path(str(destination) + suffix).exists() for suffix in ['', '.json', '-wal', '-shm']):
        raise ValueError('Source must exist; backup and manifest must be new.')
    destination.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    # O_EXCL also refuses a raced preexisting file/symlink; sqlite backup includes committed WAL pages.
    fd = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    os.close(fd)
    try:
        with readonly(source) as original, sqlite3.connect(destination) as copy:
            original.backup(copy)
            data = fingerprint(copy)
        manifest = {'provider': 'SQLite', 'createdAt': datetime.now(timezone.utc).isoformat(), 'bytes': destination.stat().st_size, 'sha256': digest(destination), **data}
        manifest_path = Path(str(destination) + '.json')
        with manifest_path.open('x') as output:
            os.chmod(manifest_path, 0o600)
            json.dump(manifest, output, indent=2)
        return manifest
    except BaseException:
        destination.unlink(missing_ok=True)
        raise


def verify(workspace, source):
    source = within(workspace, source)
    manifest = json.loads(within(workspace, str(source) + '.json').read_text())
    if digest(source) != manifest['sha256']:
        raise ValueError('Backup checksum mismatch; restoration refused.')
    with readonly(source) as connection:
        actual = fingerprint(connection)
    if any(actual[key] != manifest[key] for key in actual):
        raise ValueError('Backup records do not match the manifest.')
    return manifest


def restore(workspace, source, destination):
    source = within(workspace, source)
    destination = within(workspace, destination, False)
    manifest = verify(workspace, source)
    if any(Path(str(destination) + suffix).exists() for suffix in ['', '-wal', '-shm']):
        raise ValueError('Restore destination already exists; never overwrite.')
    destination.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    fd = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    os.close(fd)
    try:
        with readonly(source) as original, sqlite3.connect(destination) as copy:
            original.backup(copy)
            actual = fingerprint(copy)
        if any(actual[key] != manifest[key] for key in actual):
            raise ValueError('Restored records do not match backup.')
        return {'provider': 'SQLite', 'restoredAt': datetime.now(timezone.utc).isoformat(), 'verified': True, **actual}
    except BaseException:
        destination.unlink(missing_ok=True)
        raise


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['backup', 'verify', 'restore'])
    parser.add_argument('--workspace', required=True)
    parser.add_argument('--source', required=True)
    parser.add_argument('--destination')
    args = parser.parse_args()
    try:
        workspace = guarded_workspace(args.workspace)
        if args.action in ['backup', 'restore'] and not args.destination:
            parser.error('--destination is required for backup/restore.')
        result = verify(workspace, args.source) if args.action == 'verify' else globals()[args.action](workspace, args.source, args.destination)
        print(json.dumps(result, indent=2))
    except (ValueError, OSError, sqlite3.Error, KeyError, json.JSONDecodeError):
        # Do not print SQL, record contents, environment values or connection strings.
        parser.exit(1, 'Local recovery refused. Check isolated paths, marker, integrity, checksum and fresh destination.\n')
