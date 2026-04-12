import type { Metadata } from "next";
import { StaffAddReviewContent } from "@/components/dashboard/staff-add-review-content";

export const metadata: Metadata = {
  title: "Review Staff",
  description: "Review staff details before adding to the directory.",
};

export default function StaffAddReviewPage() {
  return <StaffAddReviewContent />;
}
