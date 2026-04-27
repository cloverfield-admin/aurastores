export const LIPILA_MOMO_COLLECTION_FEE_BPS = 250;
export const LIPILA_MOMO_DISBURSEMENT_FEE_BPS = 150;

export type LipilaFeePayer = "merchant" | "customer" | "wallet";

function ceilBps(amountCents: number, bps: number) {
  return Math.ceil((amountCents * bps) / 10_000);
}

export function calculateCollectionFee(input: {
  saleTotalCents: number;
  customerPaysFee: boolean;
}) {
  const saleTotalCents = Math.max(0, Math.floor(input.saleTotalCents));

  if (input.customerPaysFee) {
    const grossAmountCents = Math.ceil(
      (saleTotalCents * 10_000) / (10_000 - LIPILA_MOMO_COLLECTION_FEE_BPS),
    );
    const feeCents = Math.max(0, grossAmountCents - saleTotalCents);
    return {
      grossAmountCents,
      feeCents,
      netAmountCents: saleTotalCents,
      feeBps: LIPILA_MOMO_COLLECTION_FEE_BPS,
      feePayer: "customer" as const,
    };
  }

  const grossAmountCents = saleTotalCents;
  const feeCents = ceilBps(grossAmountCents, LIPILA_MOMO_COLLECTION_FEE_BPS);
  return {
    grossAmountCents,
    feeCents,
    netAmountCents: Math.max(0, grossAmountCents - feeCents),
    feeBps: LIPILA_MOMO_COLLECTION_FEE_BPS,
    feePayer: "merchant" as const,
  };
}

export function calculateDisbursementFee(input: { payoutAmountCents: number }) {
  const payoutAmountCents = Math.max(0, Math.floor(input.payoutAmountCents));
  const feeCents = ceilBps(payoutAmountCents, LIPILA_MOMO_DISBURSEMENT_FEE_BPS);

  return {
    grossAmountCents: payoutAmountCents,
    feeCents,
    netAmountCents: payoutAmountCents + feeCents,
    feeBps: LIPILA_MOMO_DISBURSEMENT_FEE_BPS,
    feePayer: "wallet" as const,
    payoutAmountCents,
    totalDebitCents: payoutAmountCents + feeCents,
  };
}
