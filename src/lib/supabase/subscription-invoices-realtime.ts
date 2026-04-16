"use client";

import { createBrowserClient } from "@supabase/ssr";

export type SubscriptionInvoiceTerminalStatus = "paid" | "failed";

let singleton: ReturnType<typeof createBrowserClient> | null = null;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY for Supabase realtime.");
}

function getSupabaseBrowserClient() {
  if (singleton) return singleton;

  // We rely on the existing Supabase auth session cookies managed by `@supabase/ssr`.
  // (server sets cookies; browser reads them). This client is only used for Realtime.
  singleton = createBrowserClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return singleton;
}

export function subscribeToSubscriptionInvoiceStatus(
  invoiceId: string,
  onTerminalStatus: (status: SubscriptionInvoiceTerminalStatus) => void,
) {
  const supabase = getSupabaseBrowserClient();

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
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

