/**
 * AgroOps — /
 *
 * Root route. Si hay sesión → /dashboard. Si no → /login.
 * El middleware redirige también, pero esta ruta sirve de fallback explícito
 * y permite renderizar metadata correcta en server.
 */
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export const metadata = {
  title: "AgroOps",
};

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }
  redirect("/login");
}
