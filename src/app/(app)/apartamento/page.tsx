import { redirect } from "next/navigation";
import { ResidentApartmentPage } from "@/components/apartment/ResidentApartmentPage";
import { isStaffSession } from "@/lib/auth/roles";
import { getValidatedSession } from "@/lib/auth/session";

export default async function ApartamentoPage() {
  const session = await getValidatedSession();

  if (!session) {
    redirect("/");
  }

  if (isStaffSession(session)) {
    redirect("/registro");
  }

  return <ResidentApartmentPage />;
}
