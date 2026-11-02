"""Prepare a local source ZIP only. Never connects to hosting or a database."""
from pathlib import Path
import hashlib, json, shutil, sys, tempfile, zipfile
root=Path(__file__).resolve().parent.parent
output=Path(sys.argv[1]).expanduser().resolve() if len(sys.argv)>1 else root.parent/'MixerMates-coming-soon-release.zip'
with tempfile.TemporaryDirectory(prefix='mixermates-coming-soon-') as temp:
 stage=Path(temp)/'MixerMates-coming-soon'; stage.mkdir()
 for directory in ['app','components','lib','public/fonts','public/images','public/branding/processed']:
  shutil.copytree(root/directory,stage/directory,ignore=shutil.ignore_patterns('brand-proof.png','.DS_Store','*.map'))
 for name in ['public/manifest.webmanifest','public/icon.svg','proxy.ts','instrumentation.ts','next.config.ts','next-env.d.ts','tsconfig.json','pnpm-lock.yaml','pnpm-workspace.yaml','scripts/coming-soon-build.mjs','scripts/copy-hostinger-runtime.mjs','prisma/mysql/schema.prisma']:
  target=stage/name; target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(root/name,target)
 (stage/'lib/release-scope.ts').write_text('export const RELEASE_SCOPE: "development" | "coming_soon" = "coming_soon";\n')
 package=json.loads((root/'package.json').read_text());package.pop('prisma',None)
 package['scripts']={'build':'node scripts/coming-soon-build.mjs','start':'next start --hostname 0.0.0.0','typecheck':'tsc --noEmit'}
 (stage/'package.json').write_text(json.dumps(package,indent=2)+'\n')
 (stage/'RELEASE.md').write_text('MixerMates Coming Soon — owner review candidate. NOT DEPLOYED.\n\nNode 22; pnpm install --frozen-lockfile; pnpm run build; output .next.\nPinned coming_soon; real sales disabled. No migration or seed runs at startup.\nUse existing compatible MySQL and owner-managed admin credentials only after approval.\nDo not upload SQLite, .env, tests, private uploads or credentials.\nFull backup/rollback and exact settings: project docs/PHASE_1_DEPLOYMENT_PLAN.md.\n')
 manifest={str(p.relative_to(stage)):hashlib.sha256(p.read_bytes()).hexdigest() for p in stage.rglob('*') if p.is_file()}
 for name in manifest:
  if any(part in ['.env','.local','tests','node_modules','.next'] for part in Path(name).parts) or name.startswith(('uploads/','public/uploads/')) or name.endswith(('.db','.sqlite','.sqlite3')):raise RuntimeError('Disallowed release file: '+name)
 (stage/'release-manifest.json').write_text(json.dumps({'scope':'coming_soon','files':manifest},indent=2)+'\n')
 output.parent.mkdir(parents=True,exist_ok=True)
 with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as archive:
  for p in sorted(stage.rglob('*')):
   if p.is_file():archive.write(p,p.relative_to(stage.parent))
 print(f'Prepared local Coming Soon candidate: {output} ({len(manifest)} files). Nothing uploaded.')
