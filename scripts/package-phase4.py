"""Prepare a guarded, integrated source candidate. Never uploads or connects to a database."""
from pathlib import Path
import hashlib,json,shutil,tempfile,zipfile,sys
root=Path(__file__).resolve().parent.parent
output=Path(sys.argv[1]).expanduser().resolve() if len(sys.argv)>1 else root.parent/'MixerMates-Phase4-Integrated-Release.zip'
frozen=root.parent/'MixerMates-coming-soon-release.zip'
if output==frozen:raise SystemExit('The frozen Phase 1 archive must never be overwritten.')
with tempfile.TemporaryDirectory(prefix='mixermates-phase4-package-') as temp:
 stage=Path(temp)/'MixerMates-website';stage.mkdir()
 for folder in ['app','components','lib','public/fonts','public/images','public/vendor/maplibre-6.4.1','public/branding/processed','prisma/mysql']:
  shutil.copytree(root/folder,stage/folder,ignore=shutil.ignore_patterns('*.db','*.db-*','.DS_Store','__pycache__','brand-proof.png','asset-report.json'))
 for name in ['public/manifest.webmanifest','public/icon.svg','proxy.ts','instrumentation.ts','next.config.ts','next-env.d.ts','tsconfig.json','pnpm-lock.yaml','pnpm-workspace.yaml','scripts/sync-map-worker.mjs','scripts/integrated-release-build.mjs','scripts/copy-hostinger-runtime.mjs','scripts/expire-reservations.mjs','scripts/validate-release-env.mjs']:
  target=stage/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(root/name,target)
 (stage/'lib/release-scope.ts').write_text('export const RELEASE_SCOPE: "development" | "coming_soon" = "coming_soon";\n')
 package=json.loads((root/'package.json').read_text());package.pop('prisma',None);package['scripts']={'build':'node scripts/integrated-release-build.mjs','start':'node scripts/validate-release-env.mjs && next start --hostname 0.0.0.0','typecheck':'tsc --noEmit','db:migrate:deploy':'prisma migrate deploy --schema prisma/mysql/schema.prisma','reservations:expire':'node --import tsx scripts/expire-reservations.mjs'}
 (stage/'package.json').write_text(json.dumps(package,indent=2)+'\n')
 docs=['PHASE_4_DEPLOYMENT_PLAN.md','PHASE_4_RELEASE_READINESS.md','PHASE_4_ENVIRONMENT.example','PHASE_4_REPORT.md','PHASE_4_CHECKLIST.md','PHASE_4_SECURITY_TESTS.md','CUSTOMER_BOOKING_AND_PAYMENT.md','phase4/release-smoke-current.json','phase4/preservation-check-current.json','phase4/release-progress-20261026.json','phase4/dependency-audit-current.json','phase4/build-results-current.json','phase4/mariadb-runtime-results-current.json','phase4/mariadb-host-restore.json','phase4/host-file-backup.json','phase4/mysql-default-compatibility.json','phase4/mysql-default-normalization.json','phase4/mysql-recovery.json','phase4/build-results.json','phase4/release-smoke.json','phase4/design-review-verdict.md']
 for name in docs:
  target=stage/'docs'/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(root/'docs'/name,target)
 shutil.copytree(root/'docs/phase4/mysql-before',stage/'docs/phase4/mysql-before')
 (stage/'RELEASE.md').write_text('MixerMates integrated Phase 0–4 guarded source candidate. NOT DEPLOYED.\n\nContains complete current application/backend, production MySQL schema/migrations and official assets. Node 22.x, pnpm; root MixerMates-website, build pnpm run build, output .next.\n\nComing Soon pinned; real sales locked; local customer/test paths unavailable in production. Admin/organizer preview retains existing authenticated permissions after safe migration/provisioning. No startup migration or seed. No test accounts or test records. Do not upload until current production version/schema/checksums/backup and rollback are verified and owner explicitly approves.\n\nSee docs/PHASE_4_DEPLOYMENT_PLAN.md. This is source, not a prebuilt macOS runtime. Build on the Linux hosting runtime for its native Prisma engine. No data reset or automatic seed is authorized.\n')
 manifest={str(p.relative_to(stage)):hashlib.sha256(p.read_bytes()).hexdigest() for p in stage.rglob('*') if p.is_file()}
 forbidden=['VibeyDemo2026!','Mixermates12@','IsolatedPhase3Test!','FictionalPhase4Test!']
 for name in manifest:
  if any(x in Path(name).parts for x in ['.env','.local','tests','node_modules','.next','fixtures']) or name.startswith('public/uploads/') or name.endswith(('.db','.sqlite','.sqlite3')):raise RuntimeError('Disallowed candidate file: '+name)
  content=(stage/name).read_bytes()
  if any(value.encode() in content for value in forbidden):raise RuntimeError('Development credential detected: '+name)
 (stage/'release-manifest.json').write_text(json.dumps({'scope':'phase0-4-integrated-guarded','siteMode':'coming_soon','realSales':'disabled','files':manifest},indent=2)+'\n')
 output.parent.mkdir(parents=True,exist_ok=True)
 with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as archive:
  for p in sorted(stage.rglob('*')):
   if p.is_file():archive.write(p,p.relative_to(stage.parent))
 digest=hashlib.sha256(output.read_bytes()).hexdigest();audit={'path':str(output),'sha256':digest,'files':len(manifest)+1,'sourceFiles':manifest,'containsLatestCustomerAPI':manifest.get('lib/customer-api.ts')==hashlib.sha256((root/'lib/customer-api.ts').read_bytes()).hexdigest(),'deployed':False}
 (root/'docs/phase4/release-audit.json').write_text(json.dumps(audit,indent=2)+'\n');output.with_suffix('.zip.sha256').write_text(digest+'  '+output.name+'\n')
 print('Prepared integrated guarded source candidate:',output);print('SHA-256:',digest);print('No upload, migration, seed or deployment performed.')
