import type { Metadata } from "next";
import { RegisterPortal } from "@/components/auth/register-portal";

export const metadata: Metadata = {
  title: "Register — AuraPharma",
  description:
    "Create your AuraPharma account and access clinical intelligence tools for your pharmacy.",
};

export default function RegisterPage() {
  return <RegisterPortal />;
}
