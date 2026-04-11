import type { AuthContext } from "@/lib/repositories/auth/auth.repository";
import type { AddStaffByEmailInput, StaffRepository } from "@/lib/repositories/staff/staff.repository";

type StaffServiceDeps = {
  staff: StaffRepository;
};

export class StaffService {
  private readonly staff: StaffRepository;

  constructor(deps: StaffServiceDeps) {
    this.staff = deps.staff;
  }

  listDirectory(...args: Parameters<StaffRepository["listDirectory"]>) {
    return this.staff.listDirectory(...args);
  }

  addMemberByEmail(context: AuthContext, input: AddStaffByEmailInput) {
    return this.staff.addMemberByEmail(context, input);
  }
}
