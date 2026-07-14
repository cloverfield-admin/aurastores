"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

export type SubscriptionInvoiceTerminalStatus = "paid" | "failed";

export function subscribeToSubscriptionInvoiceStatus(
  invoiceId: string,
  onTerminalStatus: (status: SubscriptionInvoiceTerminalStatus) => void,
) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return () => {};
  }

  const channelName = `subscription-invoice:${invoiceId}`;

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "subscription_invoices",
        // Supabase postgres_changes filter uses a PostgREST-style expression.
        filter: `id=eq.${invoiceId}`,
      },
      (payload: { new?: { status?: string | null } }) => {
        const status = payload.new?.status;
        if (status === "paid" || status === "failed") onTerminalStatus(status);
      },
    )
    .subscribe((status: string, err?: unknown) => {
      void status;
      void err;
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}

