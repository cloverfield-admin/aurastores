import type { Metadata } from "next";
import { OrganizationManagementContent } from "@/components/dashboard/organization-management-content";

export const metadata: Metadata = {
  title: "Organization",
  description: "Organization-wide settings and management for your pharmacy network.",
};

export default function OrganizationPage() {
  return <OrganizationManagementContent />;
}
