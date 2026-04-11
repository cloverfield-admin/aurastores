"use client";

/** Pre-`navigator.mediaDevices` callback API */
type LegacyConstraintsCallback = (
  constraints: MediaStreamConstraints,
  onSuccess: (stream: MediaStream) => void,
  onError: (error: Error) => void,
) => void;

type NavigatorWithLegacy = Navigator & {
  getUserMedia?: LegacyConstraintsCallback;
  webkitGetUserMedia?: LegacyConstraintsCallback;
  mozGetUserMedia?: LegacyConstraintsCallback;
};

type QuaggaResult = {
  codeResult?: {
    code?: string | null;
  };
};

/**
 * Some WebKit builds only expose the old callback API. Quagga expects `navigator.mediaDevices.getUserMedia`.
 */
function polyfillMediaDevicesGetUserMedia(): void {
  if (typeof navigator === "undefined") {
    return;
  }
  const existing = navigator.mediaDevices as Partial<MediaDevices> | undefined;
  if (typeof existing?.getUserMedia === "function") {
    return;
  }

  const nav = navigator as NavigatorWithLegacy;
  const legacy = nav.getUserMedia ?? nav.webkitGetUserMedia ?? nav.mozGetUserMedia;
  if (!legacy) {
    return;
  }

  const devices = navigator.mediaDevices ?? ({} as MediaDevices);
  if (!navigator.mediaDevices) {
    Object.defineProperty(navigator, "mediaDevices", {
      value: devices,
      writable: true,
      configurable: true,
    });
  }

  devices.getUserMedia = (constraints) =>
    new Promise((resolve, reject) => {
      legacy.call(navigator, constraints ?? {}, resolve, reject);
    });
}

function describeCameraBlockReason(): string | null {
  if (typeof window === "undefined") {
    return "Camera is only available in the browser.";
  }

  if (!window.isSecureContext) {
    return "Camera needs a secure page. Use https:// or open via http://localhost — plain http:// on your Wi‑Fi IP (e.g. 192.168.x.x) does not expose the camera on iPhone and most phones.";
  }

  polyfillMediaDevicesGetUserMedia();

  const mediaDevices = navigator.mediaDevices as Partial<MediaDevices> | undefined;
  if (typeof mediaDevices?.getUserMedia !== "function") {
    return "This browser cannot use the camera here. On iPhone use Safari (not Chrome or in‑app browsers like Instagram or Facebook), and allow camera when prompted.";
  }

  return null;
}

export type QuaggaLiveScanOptions = {
  target: HTMLElement;
  onCode: (code: string) => void;
  onError?: (message: string) => void;
  /** After a successful decode, stop the camera (default true). */
  singleScan?: boolean;
  signal?: AbortSignal;
};

const DEDUPE_MS = 900;

function readCode(data: QuaggaResult): string | null {
  const raw = data.codeResult?.code;
  if (raw == null || raw === "") {
    return null;
  }
  return String(raw).trim();
}

function mapInitError(err: unknown): string {
  if (err && typeof err === "object" && "name" in err && (err as { name?: string }).name === "NotAllowedError") {
    return "Camera access was denied. Allow the camera for this site, or use HTTPS.";
  }
  if (err && typeof err === "object" && "name" in err && (err as { name?: string }).name === "NotFoundError") {
    return "No camera was found on this device.";
  }
  if (err instanceof Error && /getUserMedia|mediaDevices/i.test(err.message)) {
    return (
      describeCameraBlockReason() ??
      "Camera is not available in this browser context. Use https:// or localhost on a phone, and Safari on iPhone."
    );
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return "Could not start the barcode scanner.";
}

/**
 * Starts Quagga2 on a live video stream. Only call from the browser (e.g. inside useEffect).
 * Dynamically imports Quagga so it is never loaded on the server.
 */
export async function startQuaggaLiveScan(options: QuaggaLiveScanOptions): Promise<() => Promise<void>> {
  const { target, onCode, onError, singleScan = true, signal } = options;

  if (signal?.aborted) {
    return async () => {};
  }

  const blocked = describeCameraBlockReason();
  if (blocked) {
    onError?.(blocked);
    return async () => {};
  }

  const { default: Quagga } = await import("@ericblade/quagga2");

  while (target.firstChild) {
    target.removeChild(target.firstChild);
  }

  let lastEmitted = "";
  let lastEmittedAt = 0;

  const onDetected = (data: QuaggaResult) => {
    const code = readCode(data);
    if (!code) {
      return;
    }

    const now = Date.now();
    if (code === lastEmitted && now - lastEmittedAt < DEDUPE_MS) {
      return;
    }
    lastEmitted = code;
    lastEmittedAt = now;

    onCode(code);

    if (singleScan) {
      void stopInternal();
    }
  };

  const stopInternal = async () => {
    Quagga.offDetected(onDetected);
    try {
      await Quagga.stop();
    } catch {
      /* ignore teardown errors */
    }
    try {
      await Quagga.CameraAccess.release();
    } catch {
      /* ignore */
    }
  };

  const onAbort = () => {
    void stopInternal();
  };
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    await Quagga.init({
      inputStream: {
        type: "LiveStream",
        target,
        constraints: {
          facingMode: "environment",
          width: { min: 480, ideal: 1280 },
          height: { min: 360, ideal: 720 },
        },
        area: {
          top: "12%",
          right: "6%",
          left: "6%",
          bottom: "12%",
        },
      },
      locator: {
        patchSize: "medium",
        halfSample: true,
      },
      numOfWorkers: typeof Worker !== "undefined" ? 2 : 0,
      frequency: 12,
      decoder: {
        readers: ["ean_reader", "ean_8_reader", "code_128_reader", "upc_reader", "upc_e_reader"],
      },
      locate: true,
    });
  } catch (err) {
    onError?.(mapInitError(err));
    signal?.removeEventListener("abort", onAbort);
    return async () => {};
  }

  Quagga.onDetected(onDetected);
  Quagga.start();

  return async () => {
    signal?.removeEventListener("abort", onAbort);
    await stopInternal();
  };
}
