import { redirect } from "next/navigation";
import { AdminApartmentsDashboard } from "@/components/census/AdminApartmentsDashboard";
import { hasFullAdminAccess, isStaffSession } from "@/lib/auth/roles";
import { getValidatedSession } from "@/lib/auth/session";

export default async function ApartamentosPage() {
  const session = await getValidatedSession();

  if (!session) {
    redirect("/");
  }

  if (!isStaffSession(session) || !hasFullAdminAccess(session)) {
    redirect("/registro");
  }

  return <AdminApartmentsDashboard />;
}
