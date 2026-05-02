import type { WorkspaceSearchRepository } from "@/lib/repositories/workspace-search/workspace-search.repository";

type WorkspaceSearchServiceDeps = {
  workspaceSearch: WorkspaceSearchRepository;
};

export class WorkspaceSearchService {
  private readonly workspaceSearch: WorkspaceSearchRepository;

  constructor(deps: WorkspaceSearchServiceDeps) {
    this.workspaceSearch = deps.workspaceSearch;
  }

  search(...args: Parameters<WorkspaceSearchRepository["search"]>) {
    return this.workspaceSearch.search(...args);
  }
}
