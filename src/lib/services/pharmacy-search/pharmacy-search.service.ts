import type { PharmacySearchRepository } from "@/lib/repositories/pharmacy-search/pharmacy-search.repository";

type PharmacySearchServiceDeps = {
  pharmacySearch: PharmacySearchRepository;
};

export class PharmacySearchService {
  private readonly pharmacySearch: PharmacySearchRepository;

  constructor(deps: PharmacySearchServiceDeps) {
    this.pharmacySearch = deps.pharmacySearch;
  }

  search(...args: Parameters<PharmacySearchRepository["search"]>) {
    return this.pharmacySearch.search(...args);
  }
}
