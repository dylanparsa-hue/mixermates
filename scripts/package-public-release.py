"""Prepare the latest sanitized public-demo source; no upload or DB connection."""
from pathlib import Path
import json,shutil,zipfile,hashlib,sys,tempfile
root=Path(__file__).resolve().parent.parent
output=Path(sys.argv[1]).resolve()
with tempfile.TemporaryDirectory(prefix='mixermates-public-') as temp:
 stage=Path(temp)/'MixerMates-website';stage.mkdir()
 for directory in ['app','components','lib','public','prisma/mysql']:
  shutil.copytree(root/directory,stage/directory,ignore=shutil.ignore_patterns('*.db','*.db-*','.DS_Store','uploads','original','*.mp4','__pycache__'))
 for file in ['proxy.ts','instrumentation.ts','next.config.ts','next-env.d.ts','tsconfig.json','pnpm-lock.yaml','pnpm-workspace.yaml','scripts/sync-map-worker.mjs','scripts/build-public-release.mjs','scripts/copy-hostinger-runtime.mjs','scripts/validate-public-release-env.mjs','scripts/install-public-demos.mts']:
  target=stage/file;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(root/file,target)
 shutil.copy2(root/'prisma/mysql/schema.prisma',stage/'prisma/schema.prisma')
 shutil.copytree(root/'prisma/mysql/migrations',stage/'prisma/migrations')
 (stage/'lib/release-scope.ts').write_text('export const RELEASE_SCOPE: "development" | "coming_soon" | "public_demo" = "public_demo";\n')
 package=json.loads((root/'package.json').read_text());package.pop('prisma',None)
 package['scripts']={'build':'node scripts/build-public-release.mjs','start':'node scripts/validate-public-release-env.mjs && next start --hostname 0.0.0.0','typecheck':'tsc --noEmit','db:migrate:deploy':'prisma migrate deploy --schema prisma/mysql/schema.prisma'}
 (stage/'package.json').write_text(json.dumps(package,indent=2)+'\n')
 files={str(p.relative_to(stage)):hashlib.sha256(p.read_bytes()).hexdigest() for p in stage.rglob('*') if p.is_file()}
 for name in files:
  if any(p in Path(name).parts for p in ['.env','.local','fixtures','tests','node_modules','.next','uploads']) or name.endswith(('.db','.sqlite','.sqlite3')):raise RuntimeError('Forbidden release file: '+name)
 manifest={'version':'public-demo-20261029-r2','scope':'complete-website-public-demo','realSales':'disabled','billing':'disabled','files':files}
 (stage/'release-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 output.parent.mkdir(parents=True,exist_ok=True)
 with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as z:
  for p in sorted(stage.rglob('*')):
   if p.is_file():z.write(p,p.relative_to(stage.parent))
 digest=hashlib.sha256(output.read_bytes()).hexdigest();output.with_suffix('.zip.sha256').write_text(digest+'  '+output.name+'\n')
 print(json.dumps({'path':str(output),'sha256':digest,'files':len(files)+1,'version':manifest['version']}))
