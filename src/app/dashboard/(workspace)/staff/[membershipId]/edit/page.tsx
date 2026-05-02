import type { Metadata } from "next";
import { EditStaffContent } from "@/components/dashboard/edit-staff-content";

export const metadata: Metadata = {
  title: "Edit Staff",
  description: "Update staff member profile, role, branches, and credentials.",
};

export default function EditStaffPage() {
  return <EditStaffContent />;
}
