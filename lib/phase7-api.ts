import { z } from "zod";
import { requestEventChange, reviewEventChange } from "./event-operations";
import {
  runOperationalJobs,
  retryNotification,
  recoverIssuance,
} from "./operational-jobs";
const id = z.string().min(1).max(191);
export async function phase7Post(userId: string, p: string, input: unknown) {
  if (p === "event-operations/request")
    return requestEventChange(userId, input);
  if (p === "event-operations/review") return reviewEventChange(userId, input);
  if (p === "job-operations/run") {
    z.object({}).strict().parse(input);
    return runOperationalJobs(userId);
  }
  const d = z.object({ id }).strict().parse(input);
  if (p === "job-operations/retry") return retryNotification(userId, d.id);
  if (p === "job-operations/issuance") return recoverIssuance(userId, d.id);
  throw Error("404:Not found.");
}
