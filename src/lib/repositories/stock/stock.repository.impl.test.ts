import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthContext } from "@/lib/repositories/auth/auth.repository";
import { fullCapabilities } from "@/lib/rbac/capabilities";
import { StockRepositoryImpl } from "@/lib/repositories/stock/stock.repository.impl";
import type { CreateStockBatchesInput } from "@/lib/validation/stock";

const dbMock = vi.hoisted(() => ({
  transaction: vi.fn(),
  select: vi.fn(),
  query: {
    branches: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({
  db: dbMock,
}));

type QueueValue<T> = T | Error;

function shiftQueue<T>(queue: Array<QueueValue<T>>, label: string): T {
  if (queue.length === 0) {
    throw new Error(`Missing mock value for ${label}.`);
  }

  const next = queue.shift() as QueueValue<T>;

  if (next instanceof Error) {
    throw next;
  }

  return next;
}

function createSelectMock(queue: Array<QueueValue<unknown[]>>) {
  return vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(async () => shiftQueue(queue, "select.where")),
    })),
  }));
}

function createInsertMock(
  returningQueue: Array<QueueValue<unknown[]>>,
  awaitQueue: Array<QueueValue<unknown>> = [],
) {
  return vi.fn(() => {
    const builder = {
      values: vi.fn(() => builder),
      onConflictDoNothing: vi.fn(() => builder),
      returning: vi.fn(async () => shiftQueue(returningQueue, "insert.returning")),
      then: (resolve: (value: unknown) => unknown, reject: (reason?: unknown) => unknown) =>
        Promise.resolve(awaitQueue.length ? shiftQueue(awaitQueue, "insert.await") : undefined).then(
          resolve,
          reject,
        ),
    };

    return builder;
  });
}

function createUpdateMock(queue: Array<QueueValue<unknown[]>>) {
  return vi.fn(() => {
    const builder = {
      set: vi.fn(() => builder),
      where: vi.fn(() => builder),
      returning: vi.fn(async () => shiftQueue(queue, "update.returning")),
    };

    return builder;
  });
}

function createMockTx(options: {
  branchQueue?: Array<QueueValue<unknown>>;
  selectQueue?: Array<QueueValue<unknown[]>>;
  insertReturningQueue?: Array<QueueValue<unknown[]>>;
  insertAwaitQueue?: Array<QueueValue<unknown>>;
  updateQueue?: Array<QueueValue<unknown[]>>;
}) {
  const tx = {
    query: {
      branches: {
        findMany: vi.fn(async () => {
          const branch = shiftQueue(options.branchQueue ?? [], "tx.query.branches.findMany");
          return [branch];
        }),
      },
    },
    select: createSelectMock(options.selectQueue ?? []),
    insert: createInsertMock(options.insertReturningQueue ?? [], options.insertAwaitQueue ?? []),
    update: createUpdateMock(options.updateQueue ?? []),
  };

  return tx;
}

function configureDb(options: {
  tx: ReturnType<typeof createMockTx>;
  dbBranchQueue?: Array<QueueValue<unknown>>;
  dbSelectQueue?: Array<QueueValue<unknown[]>>;
}) {
  dbMock.transaction.mockImplementation(async (callback: (tx: object) => Promise<unknown>) =>
    callback(options.tx),
  );
  dbMock.query.branches.findMany.mockImplementation(async () => {
    const branch = shiftQueue(options.dbBranchQueue ?? [], "db.query.branches.findMany");
    return [branch];
  });
  dbMock.select.mockImplementation(createSelectMock(options.dbSelectQueue ?? []));
}

function createContext(): AuthContext {
  return {
    user: { id: "user-1" } as AuthContext["user"],
    membership: { id: "membership-1", role: "owner" } as AuthContext["membership"],
    organization: { id: "org-1" } as AuthContext["organization"],
    onboarding: null,
    isPlatformAdmin: false,
    capabilities: fullCapabilities(),
    entitlements: {
      capabilities: {
        stock: true,
        sales: true,
        catalog: true,
        insights: true,
        pay: true,
        staff: true,
        expenses: true,
        organization: true,
      },
      limits: {
        products: null,
        salesTransactions: null,
        categories: null,
        staffUsers: null,
        branches: null,
      },
    },
    subscription: {
      planCode: "free",
      planName: "Free",
      interval: "monthly",
      status: "active",
      currentPeriodStart: new Date(),
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      scheduledPlanCode: null,
      introPaidTrialEligible: true,
    },
    allowedBranchIds: null,
  };
}

function createInput(overrides: Partial<CreateStockBatchesInput[number]> = {}): CreateStockBatchesInput[number] {
  return {
    branchId: undefined,
    productName: "Aspirin",
    productBarcode: undefined,
    batchNumber: "LOT-1",
    expiresAt: "2027-01-01",
    quantityReceived: 10,
    unitOrderPrice: 2.5,
    supplierName: undefined,
    categoryName: undefined,
    purchaseOrderNumber: undefined,
    unitSellingPrice: 5,
    notes: undefined,
    ...overrides,
  };
}

describe("StockRepositoryImpl.createBatches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns mixed results and keeps duplicate rows aligned by index", async () => {
    const tx = createMockTx({
      branchQueue: [{ id: "branch-1", name: "Main", isPrimary: true }],
      selectQueue: [[], []],
      insertReturningQueue: [
        [
          {
            id: "product-1",
            name: "Aspirin",
            barcode: null,
            categoryId: null,
            defaultSellingPriceCents: 500,
          },
        ],
        [{ id: "batch-1", batchNumber: "LOT-1", productId: "product-1" }],
      ],
      insertAwaitQueue: [undefined],
    });
    configureDb({ tx });

    const repository = new StockRepositoryImpl();
    const results = await repository.createBatches(createContext(), [
      createInput(),
      createInput(),
    ]);

    expect(results).toEqual([
      { ok: true, data: { id: "batch-1", batchNumber: "LOT-1", productName: "Aspirin" } },
      { ok: false, error: "Duplicate row: same product name and batch number." },
    ]);
  });

  it("fails rows that target a different branch than the shared bulk request branch", async () => {
    const tx = createMockTx({
      branchQueue: [{ id: "branch-1", name: "Main", isPrimary: true }],
      selectQueue: [[], []],
      insertReturningQueue: [
        [
          {
            id: "product-1",
            name: "Aspirin",
            barcode: null,
            categoryId: null,
            defaultSellingPriceCents: 500,
          },
        ],
        [{ id: "batch-1", batchNumber: "LOT-1", productId: "product-1" }],
      ],
      insertAwaitQueue: [undefined],
    });
    configureDb({ tx });

    const repository = new StockRepositoryImpl();
    const results = await repository.createBatches(createContext(), [
      createInput({ branchId: "branch-1" }),
      createInput({ branchId: "branch-2", batchNumber: "LOT-2" }),
    ]);

    expect(results).toEqual([
      { ok: true, data: { id: "batch-1", batchNumber: "LOT-1", productName: "Aspirin" } },
      { ok: false, error: "Bulk batch creation can only target one branch per request." },
    ]);
  });

  it("fails all conflicting rows when one barcode is assigned to multiple products in the same upload", async () => {
    const tx = createMockTx({
      branchQueue: [{ id: "branch-1", name: "Main", isPrimary: true }],
    });
    configureDb({ tx });

    const repository = new StockRepositoryImpl();
    const results = await repository.createBatches(createContext(), [
      createInput({ productName: "Aspirin", productBarcode: "BAR-1" }),
      createInput({ productName: "Ibuprofen", productBarcode: "BAR-1", batchNumber: "LOT-2" }),
    ]);

    expect(results).toEqual([
      { ok: false, error: "This barcode is assigned to multiple products in this upload." },
      { ok: false, error: "This barcode is assigned to multiple products in this upload." },
    ]);
  });

  it("detects existing batch conflicts case-insensitively before insert", async () => {
    const tx = createMockTx({
      branchQueue: [{ id: "branch-1", name: "Main", isPrimary: true }],
      selectQueue: [
        [
          {
            id: "product-1",
            name: "Aspirin",
            barcode: null,
            categoryId: null,
            defaultSellingPriceCents: 500,
          },
        ],
        [{ productId: "product-1", batchLower: "lot-1" }],
      ],
    });
    configureDb({ tx });

    const repository = new StockRepositoryImpl();
    const results = await repository.createBatches(createContext(), [createInput({ batchNumber: "Lot-1" })]);

    expect(results).toEqual([{ ok: false, error: "A batch with this number already exists for that product." }]);
  });

  it("maps batch uniqueness races back into row-level errors", async () => {
    const tx = createMockTx({
      branchQueue: [{ id: "branch-1", name: "Main", isPrimary: true }],
      selectQueue: [
        [
          {
            id: "product-1",
            name: "Aspirin",
            barcode: null,
            categoryId: null,
            defaultSellingPriceCents: 500,
          },
        ],
        [],
      ],
      insertReturningQueue: [],
    });
    configureDb({
      tx,
      dbBranchQueue: [{ id: "branch-1", name: "Main", isPrimary: true }],
      dbSelectQueue: [
        [{ id: "product-1", name: "Aspirin" }],
        [{ productId: "product-1", batchLower: "lot-1" }],
      ],
    });

    tx.insert.mockImplementationOnce(() => {
      const builder = createInsertMock([
        Object.assign(new Error("duplicate key value violates unique constraint"), {
          code: "23505",
          constraint: "inventory_batches_branch_product_lower_batch_idx",
        }),
      ])();
      return builder;
    });

    const repository = new StockRepositoryImpl();
    const results = await repository.createBatches(createContext(), [createInput()]);

    expect(results).toEqual([{ ok: false, error: "A batch with this number already exists for that product." }]);
  });

  it("updates each product at most once even when multiple rows reference it", async () => {
    const tx = createMockTx({
      branchQueue: [{ id: "branch-1", name: "Main", isPrimary: true }],
      selectQueue: [
        [],
        [
          {
            id: "product-1",
            name: "Aspirin",
            barcode: null,
            categoryId: null,
            defaultSellingPriceCents: 100,
          },
        ],
        [],
      ],
      insertReturningQueue: [
        [{ id: "category-1", name: "Pain Relief" }],
        [
          { id: "batch-1", batchNumber: "LOT-1", productId: "product-1" },
          { id: "batch-2", batchNumber: "LOT-2", productId: "product-1" },
        ],
      ],
      insertAwaitQueue: [undefined],
      updateQueue: [
        [
          {
            id: "product-1",
            name: "Aspirin",
            barcode: null,
            categoryId: "category-1",
            defaultSellingPriceCents: 500,
          },
        ],
      ],
    });
    configureDb({ tx });

    const repository = new StockRepositoryImpl();
    const results = await repository.createBatches(createContext(), [
      createInput({ categoryName: "Pain Relief" }),
      createInput({ categoryName: "Pain Relief", batchNumber: "LOT-2" }),
    ]);

    expect(results).toEqual([
      { ok: true, data: { id: "batch-1", batchNumber: "LOT-1", productName: "Aspirin" } },
      { ok: true, data: { id: "batch-2", batchNumber: "LOT-2", productName: "Aspirin" } },
    ]);
    expect(tx.update).toHaveBeenCalledTimes(1);
  });
});
