import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminCompaniesContent } from "@/components/admin/admin-companies-content";

export const metadata: Metadata = {
  title: "Companies · AuraStores Admin",
  description: "Every store on the platform.",
};

export default function AdminCompaniesPage() {
  // useSearchParams (filters + pagination) needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <AdminCompaniesContent />
    </Suspense>
  );
}
