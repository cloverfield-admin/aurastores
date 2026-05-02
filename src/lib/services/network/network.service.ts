import type { NetworkRepository } from "@/lib/repositories/network/network.repository";

type NetworkServiceDeps = {
  network: NetworkRepository;
};

export class NetworkService {
  private readonly network: NetworkRepository;

  constructor(deps: NetworkServiceDeps) {
    this.network = deps.network;
  }

  getDashboard(...args: Parameters<NetworkRepository["getDashboard"]>) {
    return this.network.getDashboard(...args);
  }

  getOrganizationBranches(...args: Parameters<NetworkRepository["getOrganizationBranches"]>) {
    return this.network.getOrganizationBranches(...args);
  }
}
