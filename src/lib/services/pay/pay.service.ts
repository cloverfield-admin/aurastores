import type { PayRepository } from "@/lib/repositories/pay/pay.repository";

export class PayService {
  constructor(private readonly repos: { pay: PayRepository }) {}

  getDashboard(...args: Parameters<PayRepository["getDashboard"]>): ReturnType<PayRepository["getDashboard"]> {
    return this.repos.pay.getDashboard(...args);
  }

  activateWallet(...args: Parameters<PayRepository["activateWallet"]>): ReturnType<PayRepository["activateWallet"]> {
    return this.repos.pay.activateWallet(...args);
  }

  withdraw(...args: Parameters<PayRepository["withdraw"]>): ReturnType<PayRepository["withdraw"]> {
    return this.repos.pay.withdraw(...args);
  }

  getTransactionDetail(
    ...args: Parameters<PayRepository["getTransactionDetail"]>
  ): ReturnType<PayRepository["getTransactionDetail"]> {
    return this.repos.pay.getTransactionDetail(...args);
  }
}
