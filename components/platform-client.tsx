"use client";
import dynamic from "next/dynamic";
import PlatformLoading from "./platform-loading";
const Platform = dynamic(() => import("./vibey"), { loading: PlatformLoading });
export function PlatformClient({ restrictedOrganizer = false }: { restrictedOrganizer?: boolean }) {
  return <Platform restrictedOrganizer={restrictedOrganizer} />;
}
