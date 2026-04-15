import type { Metadata } from "next";
import {
  OrganizationManagementContent,
  type OrganizationPageSnapshot,
} from "@/components/dashboard/organization-management-content";
import { requireAppContext } from "@/lib/auth/session";
import type { AuthContext } from "@/lib/repositories/auth/auth.repository";

export const metadata: Metadata = {
  title: "Organization",
  description: "Organization-wide settings and management for your pharmacy network.",
};

function organizationSnapshotFromContext(org: AuthContext["organization"]): OrganizationPageSnapshot {
  return {
    displayName: org.displayName,
    legalName: org.legalName ?? null,
    status: org.status,
    primaryEmail: org.primaryEmail,
    primaryPhone: org.primaryPhone ?? null,
    slug: org.slug,
    hqAddressLine1: org.hqAddressLine1 ?? null,
    hqAddressLine2: org.hqAddressLine2 ?? null,
    hqCity: org.hqCity ?? null,
    hqState: org.hqState ?? null,
    hqPostalCode: org.hqPostalCode ?? null,
    hqCountry: org.hqCountry,
  };
}

export default async function OrganizationPage() {
  const context = await requireAppContext();
  return (
    <OrganizationManagementContent organization={organizationSnapshotFromContext(context.organization)} />
  );
}
