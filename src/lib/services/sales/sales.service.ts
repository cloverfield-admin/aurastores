import type { SalesRepository } from "@/lib/repositories/sales/sales.repository";

export class SalesService {
  constructor(private readonly repos: { sales: SalesRepository }) {}

  getDashboard(
    ...args: Parameters<SalesRepository["getDashboard"]>
  ): ReturnType<SalesRepository["getDashboard"]> {
    return this.repos.sales.getDashboard(...args);
  }

  getRecentSales(
    ...args: Parameters<SalesRepository["getRecentSales"]>
  ): ReturnType<SalesRepository["getRecentSales"]> {
    return this.repos.sales.getRecentSales(...args);
  }

  getSaleById(
    ...args: Parameters<SalesRepository["getSaleById"]>
  ): ReturnType<SalesRepository["getSaleById"]> {
    return this.repos.sales.getSaleById(...args);
  }

  getSoldItems(
    ...args: Parameters<SalesRepository["getSoldItems"]>
  ): ReturnType<SalesRepository["getSoldItems"]> {
    return this.repos.sales.getSoldItems(...args);
  }

  getCatalog(
    ...args: Parameters<SalesRepository["getCatalog"]>
  ): ReturnType<SalesRepository["getCatalog"]> {
    return this.repos.sales.getCatalog(...args);
  }

  createSale(
    ...args: Parameters<SalesRepository["createSale"]>
  ): ReturnType<SalesRepository["createSale"]> {
    return this.repos.sales.createSale(...args);
  }

  deleteSale(
    ...args: Parameters<SalesRepository["deleteSale"]>
  ): ReturnType<SalesRepository["deleteSale"]> {
    return this.repos.sales.deleteSale(...args);
  }
}
