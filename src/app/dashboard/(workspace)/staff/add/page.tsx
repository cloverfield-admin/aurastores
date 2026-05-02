import type { Metadata } from "next";
import { AddNewStaffContent } from "@/components/dashboard/add-new-staff-content";

export const metadata: Metadata = {
  title: "Add New Staff",
  description: "Onboard a new team member to your AuraStores workspace.",
};

export default function AddNewStaffPage() {
  return <AddNewStaffContent />;
}
