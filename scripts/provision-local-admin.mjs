// Local fictional admin only. This script is excluded from release archives.
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
const url=process.env.DATABASE_URL;
if(process.env.NODE_ENV === "production" || process.env.ISOLATED_TEST_DATA !== "true" || !url?.startsWith("file:") || process.env.DB_PASSWORD !== undefined) throw Error("Refusing provisioning: use an isolated local SQLite test environment only.");
const directory=path.join(process.cwd(),".local");
const destination=path.join(directory,"admin-access.json");
await mkdir(directory,{recursive:true,mode:0o700});
try {await access(destination);throw Error("Local access file already exists. Existing credentials will not be replaced.");}catch(error){if(error.code!=="ENOENT")throw error;}
const password=randomBytes(24).toString("base64url");
const email="preview.admin@example.test";
const db=new PrismaClient({datasources:{db:{url}}});
try {
  await db.user.create({data:{id:"phase1_preview_admin",name:"Local Preview Administrator",username:"phase1_admin",email,passwordHash:await hash(password,12),dob:new Date("1990-01-01"),city:"Kuala Lumpur",role:"ADMIN",verification:"UNVERIFIED"}});
  await writeFile(destination,JSON.stringify({email,password,localOnly:true},null,2)+"\n",{mode:0o600,flag:"wx"});
  console.log(`Local administrator created. Credentials are private in ${destination}; no password was printed.`);
} finally {await db.$disconnect();}
