"""Create a credential-free Hostinger source archive without changing local SQLite files."""
from pathlib import Path
import json, shutil, tempfile, zipfile
source = Path(__file__).resolve().parent.parent
output = source.parent / 'MixerMates-hostinger.zip'
with tempfile.TemporaryDirectory(prefix='mixermates-hostinger-') as temporary:
    root = Path(temporary) / 'MixerMates-website'
    root.mkdir()
    for name in ['app', 'components', 'lib', 'prisma', 'scripts', 'public']:
        shutil.copytree(source/name, root/name, ignore=shutil.ignore_patterns('*.db', '*.db-*', '__pycache__'))
    shutil.rmtree(root/'public/uploads', ignore_errors=True)
    for name in ['instrumentation.ts', 'next.config.ts', 'next-env.d.ts', 'tsconfig.json', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'PRODUCT.md', 'DESIGN.md']:
        shutil.copy2(source/name, root/name)
    (root/'docs').mkdir()
    for name in ['BRANDING.md', 'ASSETS.md', 'HOSTINGER.md']:
        shutil.copy2(source/'docs'/name, root/'docs'/name)
    shutil.copy2(root/'prisma/mysql/schema.prisma', root/'prisma/schema.prisma')
    shutil.rmtree(root/'prisma/migrations')
    shutil.copytree(root/'prisma/mysql/migrations', root/'prisma/migrations')
    package = json.loads((root/'package.json').read_text())
    package['scripts']['build'] = 'node scripts/hostinger-build.mjs'
    (root/'package.json').write_text(json.dumps(package, indent=2)+'\n')
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
        for file in root.rglob('*'):
            if file.is_file(): archive.write(file, Path(root.name)/file.relative_to(root))
print(output)
