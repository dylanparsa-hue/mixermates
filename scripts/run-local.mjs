// Run commands with a disposable workspace's environment; never loads canonical secrets.
import {readFileSync,realpathSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const cwd=realpathSync(process.cwd()),marker=JSON.parse(readFileSync('.local/regression-isolated.json','utf8'));
if(marker.fictional!==true||marker.phase!==3)throw Error('Prepare a fresh isolated workspace first.');
const env={...process.env};delete env.NODE_OPTIONS;
for(const line of readFileSync('.env','utf8').split(/\r?\n/)){if(!line||line.startsWith('#'))continue;const i=line.indexOf('=');if(i<1)continue;env[line.slice(0,i)]=line.slice(i+1).replace(/^"|"$/g,'');}
if(Object.keys(env).some(k=>k.startsWith('DB_'))||env.DATABASE_URL!=='file:'+path.join(cwd,'prisma/audit.db')||env.ISOLATED_TEST_DATA!=='true'||env.TICKET_SALES_MODE!=='disabled')throw Error('Only contained fictional SQLite with sales disabled is supported.');
env.NODE_ENV='development';env.TEST_BASE_URL=env.APP_ORIGIN;env.E2E_BASE_URL=env.APP_ORIGIN;
const [command,...args]=process.argv.slice(2);
if(command==='fixtures'){
 for(const argv of [['scripts/provision-local-admin.mjs'],['--import','tsx','scripts/organizer-phase1-e2e-fixtures.mts']]){const r=spawnSync(process.execPath,argv,{env,stdio:'inherit'});if(r.status)process.exit(r.status);}
 process.exit(0);
}

const commands={'check-social':['--import','tsx','scripts/phase3-social-account-browser.mts'],dev:['node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port',new URL(env.APP_ORIGIN).port],test:['--import','tsx','--test','--test-concurrency=1'],accounts:['--import','tsx','scripts/owner-test-access.mts'],browser:['--import','tsx','scripts/phase3-browser.mts'],e2e:['node_modules/@playwright/test/cli.js','test']};
if(!commands[command])throw Error('Use dev, test, accounts, browser or e2e.');
const extra=command==='test'&&args.length===0?readdirSync('tests').filter(x=>x.endsWith('.test.ts')).map(x=>'tests/'+x):args;
const r=spawnSync(process.execPath,[...commands[command],...extra],{env,stdio:'inherit'});process.exit(r.status??1);
