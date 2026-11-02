import { spawnSync } from 'node:child_process';
import { readFileSync, cpSync } from 'node:fs';
if (!readFileSync('lib/release-scope.ts','utf8').includes('= "coming_soon"')) throw Error('Build only the pinned Coming Soon candidate.');
const env={...process.env,DATABASE_URL:'mysql://build:build@127.0.0.1:3306/build',SITE_MODE:'coming_soon',TICKET_SALES_MODE:'disabled',HOSTINGER_DATABASE_BOOTSTRAP:'false',HOSTINGER_SEED_DEMO:'false',DEMO_MODE:'false'};
for (const key of ['DB_PASSWORD','DB_HOST','DB_USER','DB_NAME','DB_PORT']) delete env[key];
for(const [file,args] of [['node_modules/prisma/build/index.js',['generate','--schema','prisma/mysql/schema.prisma']],['node_modules/next/dist/bin/next',['build','--webpack']],['scripts/copy-hostinger-runtime.mjs',[]]]) {
 const result=spawnSync(process.execPath,[file,...args],{stdio:'inherit',env});
 if(result.status!==0)process.exit(result.status||1);
}
cpSync('public','.next/standalone/public',{recursive:true});
cpSync('.next/static','.next/standalone/.next/static',{recursive:true});
