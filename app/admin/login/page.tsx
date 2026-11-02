import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/access-policy";
import { AdminLogin } from "@/components/admin-login";
export const dynamic = "force-dynamic";
export default async function Page() {
  if (isAdmin(await currentUser())) redirect("/");
  return <AdminLogin />;
}
