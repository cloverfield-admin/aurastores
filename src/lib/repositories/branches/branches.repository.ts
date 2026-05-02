import type { AuthContext } from "@/lib/repositories/auth/auth.repository";
import type { CreateOrganizationBranchInput, UpdateOrganizationBranchInput } from "@/lib/validation/branches";

export type CreatedBranch = {
  id: string;
  name: string;
};

export type BranchOperatingHour = {
  dayOfWeek: number;
  isClosed: boolean;
  opensAt: string | null;
  closesAt: string | null;
};

export type BranchDetail = {
  id: string;
  code: string;
  name: string;
  type: "main" | "retail" | "warehouse";
  status: "draft" | "active" | "inactive" | "syncing";
  isPrimary: boolean;
  addressLine1: string;
  latitude: number | null;
  longitude: number | null;
  professionalStaffCount: number;
  operatingHours: BranchOperatingHour[];
};

export interface BranchesRepository {
  createOrganizationBranch(context: AuthContext, input: CreateOrganizationBranchInput): Promise<CreatedBranch>;
  getBranchById(context: AuthContext, branchId: string): Promise<BranchDetail | null>;
  updateBranchById(
    context: AuthContext,
    branchId: string,
    input: UpdateOrganizationBranchInput,
  ): Promise<BranchDetail>;
}

