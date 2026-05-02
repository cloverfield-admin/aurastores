import type { InsightsRepository } from "@/lib/repositories/insights/insights.repository";

type InsightsServiceDeps = {
  insights: InsightsRepository;
};

export class InsightsService {
  private readonly insights: InsightsRepository;

  constructor(deps: InsightsServiceDeps) {
    this.insights = deps.insights;
  }

  getOverview(...args: Parameters<InsightsRepository["getOverview"]>) {
    return this.insights.getOverview(...args);
  }
}

