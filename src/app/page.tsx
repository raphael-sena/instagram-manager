import { redirect } from "next/navigation";
import { lerConfig } from "@/core/config";

export const dynamic = "force-dynamic";

export default async function Inicio() {
  redirect((await lerConfig())["setup.concluido"] ? "/admin" : "/setup");
}
