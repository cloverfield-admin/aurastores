import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

export default function ChangePasswordRedirectPage() {
  redirect(ROUTES.auth.updatePassword);
}
