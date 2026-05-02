import type { BranchesRepository } from "@/lib/repositories/branches/branches.repository";

type BranchesServiceDeps = {
  branches: BranchesRepository;
};

export class BranchesService {
  private readonly branches: BranchesRepository;

  constructor(deps: BranchesServiceDeps) {
    this.branches = deps.branches;
  }

  createOrganizationBranch(...args: Parameters<BranchesRepository["createOrganizationBranch"]>) {
    return this.branches.createOrganizationBranch(...args);
  }

  getBranchById(...args: Parameters<BranchesRepository["getBranchById"]>) {
    return this.branches.getBranchById(...args);
  }

  updateBranchById(...args: Parameters<BranchesRepository["updateBranchById"]>) {
    return this.branches.updateBranchById(...args);
  }
}

