"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { StaffMemberForm } from "@/components/dashboard/staff-member-form";
import { useStaffMemberQuery } from "@/lib/queries/staff";
import { ROUTES } from "@/lib/routes";

export function EditStaffContent() {
  const params = useParams();
  const membershipId = typeof params.membershipId === "string" ? params.membershipId : undefined;
  const memberQuery = useStaffMemberQuery(membershipId);

  if (!membershipId) {
    return (
      <div className="px-4 py-16 text-center text-sm text-[#64748b]">Invalid staff link.</div>
    );
  }

  if (memberQuery.isPending) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4">
        <p className="text-sm text-[#64748b]">Loading staff member…</p>
      </div>
    );
  }

  if (memberQuery.isError || !memberQuery.data) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-sm text-red-600">Could not load this staff member.</p>
        <Link href={ROUTES.dashboard.staff} className="mt-4 inline-block text-sm font-semibold text-[#006a65]">
          Back to directory
        </Link>
      </div>
    );
  }

  return (
    <StaffMemberForm variant="edit" membershipId={membershipId} initialMember={memberQuery.data} />
  );
}
