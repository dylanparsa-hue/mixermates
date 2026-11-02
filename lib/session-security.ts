import { randomBytes, createHash } from "node:crypto";
import { transaction } from "./domain-core";
/** Bind the new session to the credentials that were actually checked by bcrypt. */
export async function persistSession(
  userId: string,
  verified?: { securityVersion: number; passwordHash: string },
) {
  const token = randomBytes(32).toString("hex");
  await transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (
      !user.active ||
      (verified &&
        (verified.securityVersion !== user.securityVersion ||
          verified.passwordHash !== user.passwordHash))
    )
      throw Error("401:Account credentials changed. Please sign in again.");
    await tx.session.create({
      data: {
        id: createHash("sha256").update(token).digest("hex"),
        userId,
        securityVersion: user.securityVersion,
        expires: new Date(Date.now() + 7 * 86400000),
      },
    });
  });
  return token;
}
