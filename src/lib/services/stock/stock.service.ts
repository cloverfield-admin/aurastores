import type { StockRepository } from "@/lib/repositories/stock/stock.repository";

export class StockService {
  constructor(private readonly repos: { stock: StockRepository }) {}

  getDashboard(
    ...args: Parameters<StockRepository["getDashboard"]>
  ): ReturnType<StockRepository["getDashboard"]> {
    return this.repos.stock.getDashboard(...args);
  }

  getCatalog(
    ...args: Parameters<StockRepository["getCatalog"]>
  ): ReturnType<StockRepository["getCatalog"]> {
    return this.repos.stock.getCatalog(...args);
  }

  getBranches(
    ...args: Parameters<StockRepository["getBranches"]>
  ): ReturnType<StockRepository["getBranches"]> {
    return this.repos.stock.getBranches(...args);
  }

  createBatch(
    ...args: Parameters<StockRepository["createBatch"]>
  ): ReturnType<StockRepository["createBatch"]> {
    return this.repos.stock.createBatch(...args);
  }

  getBatchById(
    ...args: Parameters<StockRepository["getBatchById"]>
  ): ReturnType<StockRepository["getBatchById"]> {
    return this.repos.stock.getBatchById(...args);
  }

  adjustBatches(
    ...args: Parameters<StockRepository["adjustBatches"]>
  ): ReturnType<StockRepository["adjustBatches"]> {
    return this.repos.stock.adjustBatches(...args);
  }

  disposeBatch(
    ...args: Parameters<StockRepository["disposeBatch"]>
  ): ReturnType<StockRepository["disposeBatch"]> {
    return this.repos.stock.disposeBatch(...args);
  }

  restoreDisposedBatch(
    ...args: Parameters<StockRepository["restoreDisposedBatch"]>
  ): ReturnType<StockRepository["restoreDisposedBatch"]> {
    return this.repos.stock.restoreDisposedBatch(...args);
  }
}
