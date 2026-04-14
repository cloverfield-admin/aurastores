/// <reference types="@serwist/next/typings" />

import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const apiV1NetworkOnly = {
  matcher: ({
    sameOrigin,
    url: { pathname },
  }: {
    sameOrigin: boolean;
    url: URL;
  }): boolean => sameOrigin && pathname.startsWith("/api/v1"),
  handler: new NetworkOnly(),
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [apiV1NetworkOnly, ...defaultCache],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }: { request: Request }): boolean {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
