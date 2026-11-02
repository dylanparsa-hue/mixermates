import { spawnSync } from "node:child_process";
import { readFileSync,cpSync } from "node:fs";
if(!readFileSync("lib/release-scope.ts","utf8").includes('= "public_demo"'))throw Error("Use the approved public-demo source package.");
const env={...process.env,DATABASE_URL:"mysql://build:build@127.0.0.1:3306/build",SITE_MODE:"full_platform",TICKET_SALES_MODE:"disabled",DEMO_MODE:"false",LOCAL_DEMO_BOOKING_ENABLED:"false",LOCAL_CUSTOMER_TEST_ENABLED:"false",ISOLATED_TEST_DATA:"false",MYSQL_DISPOSABLE_TEST:"false",MIXERMATES_TEST_LAB:"disabled",HOSTINGER_DATABASE_BOOTSTRAP:"false",HOSTINGER_SEED_DEMO:"false",NEXT_TELEMETRY_DISABLED:"1"};
for(const key of Object.keys(env))if(key.startsWith("DB_"))delete env[key];
for(const [file,args] of [["scripts/sync-map-worker.mjs",[]],["node_modules/prisma/build/index.js",["generate","--schema","prisma/mysql/schema.prisma"]],["node_modules/next/dist/bin/next",["build","--webpack"]],["scripts/copy-hostinger-runtime.mjs",[]]]) {
  const r=spawnSync(process.execPath,[file,...args],{stdio:"inherit",env});if(r.status!==0)process.exit(r.status||1);
}
for(const [from,to] of [["public","public"],[".next/static",".next/static"],["lib","lib"],["prisma/mysql","prisma/mysql"],["scripts/validate-public-release-env.mjs","scripts/validate-public-release-env.mjs"]])cpSync(from,".next/standalone/"+to,{recursive:true});
