import { googleAuth } from "@/lib/google-auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request,{params}:{params:Promise<{action:string}>}) { return googleAuth(req,(await params).action); }
export async function POST(req: Request,{params}:{params:Promise<{action:string}>}) { return googleAuth(req,(await params).action); }
