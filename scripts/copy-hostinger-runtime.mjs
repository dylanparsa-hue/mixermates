import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
// Keep dependency-specific resolution (including pnpm's layout) in the standalone artifact.
const root = process.cwd();
const destination = path.join(root, '.next/standalone');
const copied = new Set();
function copyPackage(directory) {
  directory = fs.realpathSync(directory);
  if (copied.has(directory)) return;
  copied.add(directory);
  const relative = path.relative(root, directory);
  if (relative.startsWith('..')) throw new Error('Runtime dependency is outside the project');
  fs.cpSync(directory, path.join(destination, relative), { recursive: true, dereference: false, force: true });
  const pkg = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'));
  for (const name of Object.keys({ ...pkg.dependencies, ...pkg.optionalDependencies, ...pkg.peerDependencies })) {
    let cursor = directory;
    while (true) {
      const dependency = path.join(cursor, 'node_modules', name);
      if (fs.existsSync(dependency)) {
        const target = fs.realpathSync(dependency);
        const link = path.join(destination, path.relative(root, dependency));
        fs.mkdirSync(path.dirname(link), { recursive: true });
        if (!fs.existsSync(link)) fs.symlinkSync(path.relative(path.dirname(link), path.join(destination, path.relative(root, target))), link);
        copyPackage(dependency);
        break;
      }
      const parent = path.dirname(cursor);
      if (parent === cursor || !parent.startsWith(root)) break;
      cursor = parent;
    }
  }
}
for (const name of Object.keys(JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).dependencies)) {
  const dependency = path.join(root, 'node_modules', name);
  const actual = fs.realpathSync(dependency);
  const link = path.join(destination, 'node_modules', name);
  fs.rmSync(link, {recursive:true,force:true});
  fs.mkdirSync(path.dirname(link), {recursive:true});
  fs.symlinkSync(path.relative(path.dirname(link), path.join(destination,path.relative(root,actual))),link);
  copyPackage(dependency);
}
console.log(`Included ${copied.size} runtime packages for database setup.`);

// pnpm's generated client and Next's traced top-level client must agree.
// A host install can leave a postinstall placeholder at node_modules/.prisma.
const require = createRequire(import.meta.url);
const clientRequire = createRequire(require.resolve('@prisma/client/package.json'));
const generatedClient = path.dirname(clientRequire.resolve('.prisma/client/package.json'));
const generatedSchema = fs.readFileSync(path.join(generatedClient, 'schema.prisma'), 'utf8');
if (!generatedSchema.includes('reviewHold') || !generatedSchema.includes('provider = "mysql"'))
  throw new Error('Generate the integrated MySQL Prisma client before packaging.');
fs.cpSync(generatedClient, path.join(destination, 'node_modules/.prisma/client'), {recursive:true,force:true});
console.log('Included generated MySQL Prisma client at standalone top-level resolution path.');
