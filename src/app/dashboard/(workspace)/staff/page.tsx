import type { Metadata } from "next";
import { StaffManagementContent } from "@/components/dashboard/staff-management-content";

export const metadata: Metadata = {
  title: "Staff Management",
  description: "Monitor, verify, and coordinate your clinical workforce across the network.",
};

export default function StaffPage() {
  return <StaffManagementContent />;
}
