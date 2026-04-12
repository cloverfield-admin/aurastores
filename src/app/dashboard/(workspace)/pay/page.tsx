import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aura Pay",
  description:
    "Payments workspace for AuraPharma — connect modules to show live transaction and payout data.",
};

export default function AuraPayPage() {
  return (
    <div className="px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-[1280px]">
        <h1 className="font-[family-name:var(--font-manrope)] text-3xl font-bold text-[#191c1e]">
          Aura Pay
        </h1>
        <p className="mt-2 text-[#3c4948]">Payments workspace — connect modules to show live data.</p>
      </div>
    </div>
  );
}
