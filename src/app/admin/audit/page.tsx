import type { Metadata } from "next";
import { AdminAuditContent } from "@/components/admin/admin-audit-content";

export const metadata: Metadata = {
  title: "Audit log · AuraStores Admin",
  description: "Every platform-admin action.",
};

export default function AdminAuditPage() {
  return <AdminAuditContent />;
}
