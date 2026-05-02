import type { Metadata } from "next";
import { StaffManagementContent } from "@/components/dashboard/staff-management-content";

export const metadata: Metadata = {
  title: "Staff Management",
  description: "Monitor, verify, and coordinate your team across branches.",
};

export default function StaffPage() {
  return <StaffManagementContent />;
}
