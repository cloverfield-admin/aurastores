import type { ExpensesRepository } from "@/lib/repositories/expenses/expenses.repository";

export class ExpensesService {
  constructor(private readonly repos: { expenses: ExpensesRepository }) {}

  getDashboard(
    ...args: Parameters<ExpensesRepository["getDashboard"]>
  ): ReturnType<ExpensesRepository["getDashboard"]> {
    return this.repos.expenses.getDashboard(...args);
  }

  createExpense(
    ...args: Parameters<ExpensesRepository["createExpense"]>
  ): ReturnType<ExpensesRepository["createExpense"]> {
    return this.repos.expenses.createExpense(...args);
  }
}

