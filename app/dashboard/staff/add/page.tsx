import type { Metadata } from "next";
import { AddNewStaffContent } from "@/components/dashboard/add-new-staff-content";

export const metadata: Metadata = {
  title: "Add New Staff | AuraPharma",
  description: "Onboard a new professional to the AuraPharma clinical network.",
};

export default function AddNewStaffPage() {
  return <AddNewStaffContent />;
}
