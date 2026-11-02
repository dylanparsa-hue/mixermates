/** Regenerate credentials only for named fictional personas in a verified disposable Lab. */
import { assertLabEnvironment } from "../lib/test-lab";
import { db } from "../lib/db";
import { activateOrganizer } from "../lib/organizer-identity";
import { randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { mkdir, writeFile, chmod } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
const marker=await assertLabEnvironment();
const directory=path.join(homedir(),'.mixermates-private');
await mkdir(directory,{recursive:true,mode:0o700});await chmod(directory,0o700);
await activateOrganizer(marker.personas.Customer);
let text=`MIXERMATES OWNER TEST ACCESS\nLOCAL FICTIONAL ACCOUNTS ONLY\nURL: ${process.env.APP_ORIGIN}\nWorkspace: ${process.cwd()}\n\nOpen the URL for automatic fictional Customer entry. Workspace switches roles; independent Administrator and Entrance Staff remain separate identities.\n\n`;
for(const purpose of ['Customer','Organizer','Administrator','Community Friend'] as const){
 const id=marker.personas[purpose],user=await db.user.findUniqueOrThrow({where:{id},include:{capabilities:true}});
 if(!user.email.endsWith('@example.test')||!user.active)throw Error('Fictional active persona required.');
 const password=randomBytes(24).toString('base64url');
 await db.user.update({where:{id},data:{passwordHash:await hash(password,12),securityVersion:{increment:1}}});
 text+=`${purpose}\nEmail: ${user.email}\nUsername: ${user.username}\nDisplay name: ${user.name}\nCapabilities: ${user.role}, ${user.capabilities.filter(c=>c.active).map(c=>c.capability).join(', ')}\nActive: yes\nLogin method: email/password; also guarded local role switching\nTemporary password: ${password}\n\n`;
}
text+=`Reset local credentials: from this disposable workspace run node --env-file=.env --import tsx scripts/owner-test-access.mts. This rotates only these fictional accounts and invalidates their old sessions.\n\nGoogle-only accounts use Google; password hashes cannot be reversed. No real Google credentials were configured or reset. Signup remains pending until profile completion.\n\nOn another computer, prepare a fresh disposable Test Lab and run this script to generate NEW local credentials. Do not commit or transfer this file in plaintext. If needed, use your encrypted password manager's secure sharing; regenerating locally is preferred.\n`;
const file=path.join(directory,'MIXERMATES_OWNER_TEST_ACCESS.txt');await writeFile(file,text,{mode:0o600});await chmod(file,0o600);
console.log('Owner-only credentials generated at '+file+' (0600). No passwords logged.');
await db.$disconnect();
