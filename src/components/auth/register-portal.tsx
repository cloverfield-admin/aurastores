"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import { AuraAvatar } from "@/components/ui/aura-avatar";
import { AuraInlineAlert } from "@/components/ui/aura-inline-alert";
import { useSignUpMutation } from "@/lib/queries/auth";
import { ROUTES } from "@/lib/routes";

const REGISTER_SOCIAL_PROOF = ["Alex Morgan", "Jordan Lee", "Sam Rivera"] as const;

function RegisterFieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block pl-1 text-base font-semibold uppercase tracking-wide text-[#6c7a78]"
    >
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-transparent bg-[#f2f4f6] p-4 text-base font-medium text-[#191c1e] outline-none placeholder:text-[rgba(108,122,120,0.5)] focus:border-[#006a65]/20 focus:ring-2 focus:ring-[#006a65]/20";

export function RegisterPortal() {
  const router = useRouter();
  const { notify, withLoading, isLoading } = useAuraFeedback();
  const signUpMutation = useSignUpMutation();
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [pharmacyName, setPharmacyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const isBusy = isLoading("auth-sign-up");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    try {
      const payload = await withLoading("auth-sign-up", "Creating your Aura workspace...", () =>
        signUpMutation.mutateAsync({
          fullName,
          pharmacyName,
          email,
          password,
        }),
      );

      if (payload.requiresEmailVerification) {
        const message = "Account created. Check your email to verify your account, then sign in.";
        setInfo(message);
        notify({
          variant: "success",
          title: "Account created",
          description: message,
        });
        router.push(payload.redirectTo ?? ROUTES.auth.signIn);
        return;
      }

      notify({
        variant: "success",
        title: "Welcome to AuraPharma",
        description: "Your workspace is ready. Continue with onboarding to finish setup.",
      });
      router.push(payload.redirectTo ?? ROUTES.dashboard.onboarding.root);
      router.refresh();
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Could not create your account.";
      setError(message);
      notify({
        variant: "error",
        title: "Registration failed",
        description: message,
      });
    }
  }

  return (
    <div className="relative min-h-dvh bg-[#f7f9fb]">
      <div
        className="pointer-events-none absolute right-8 top-48 size-64 rounded-full opacity-[0.03] blur-[70px]"
        style={{
          background: "linear-gradient(135deg, rgb(15, 185, 177) 0%, rgb(96, 99, 238) 100%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-24 left-[28rem] size-96 rounded-full bg-[#6063ee] opacity-[0.03] blur-[80px] max-lg:left-1/2"
        aria-hidden
      />

      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between border-b border-[rgba(20,184,166,0.1)] bg-white/80 px-6 backdrop-blur-md sm:px-12">
        <Link href="/" className="bg-gradient-to-r from-[#14b8a6] to-[#6366f1] bg-clip-text text-2xl font-bold tracking-tight text-transparent">
          AuraPharma
        </Link>
        <div className="flex min-w-0 items-center gap-2 sm:gap-6">
          <span className="truncate text-xs font-medium uppercase tracking-[0.05em] text-[#6c7a78] sm:text-base">
            Already a member?
          </span>
          <Link
            href={ROUTES.auth.signIn}
            className="text-base font-semibold text-[#0d9488] hover:underline"
          >
            Log in
          </Link>
        </div>
      </header>

      <div className="flex min-h-dvh flex-col pt-16 lg:flex-row">
        {/* Left: marketing */}
        <aside className="relative flex flex-col justify-center overflow-hidden bg-[#f2f4f6] px-8 py-12 lg:min-h-[calc(100dvh-4rem)] lg:w-[min(100%,512px)] lg:shrink-0 lg:px-12 lg:py-16">
          <div
            className="pointer-events-none absolute -left-24 -top-24 size-96 rounded-full opacity-20 blur-[60px]"
            style={{
              background: "linear-gradient(135deg, rgb(15, 185, 177) 0%, rgb(96, 99, 238) 100%)",
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute bottom-0 right-0 size-64 rounded-full bg-[#6063ee] opacity-10 blur-[50px]"
            aria-hidden
          />

          <div className="relative flex max-w-md flex-col gap-10 lg:max-w-none">
            <div className="space-y-4">
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-[#191c1e] sm:text-5xl sm:leading-[48px] sm:tracking-[-0.02em]">
                <span className="block">The Luminous</span>
                <span className="block bg-gradient-to-r from-[#0fb9b1] to-[#14b8a6] bg-clip-text text-transparent">
                  Laboratory
                </span>
              </h1>
              <p className="max-w-sm text-lg leading-relaxed text-[#3c4948]">
                Join thousands of pharmacists using intelligent data to transform clinical
                outcomes.
              </p>
            </div>

            <ul className="flex flex-col gap-8">
              <li className="flex gap-5">
                <div
                  className="relative flex size-12 shrink-0 items-center justify-center rounded-xl shadow-[0_10px_15px_-3px_rgba(15,185,177,0.2),0_4px_6px_-4px_rgba(15,185,177,0.2)]"
                  style={{
                    background:
                      "linear-gradient(135deg, rgb(15, 185, 177) 0%, rgb(96, 99, 238) 100%)",
                  }}
                >
                  <span className="material-symbols-outlined notranslate text-xl text-white">
                    inventory_2
                  </span>
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="font-bold text-[#191c1e]">Aura Stock: Master Your Inventory</p>
                  <p className="text-sm leading-snug text-[#3c4948]">
                    Predictive ordering and real-time waste tracking.
                  </p>
                </div>
              </li>
              <li className="flex gap-5">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#e0e3e5]">
                  <span className="material-symbols-outlined notranslate text-xl text-[#0fb9b1]">
                    show_chart
                  </span>
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="font-bold text-[#191c1e]">Aura Sales: Real-time Intelligence</p>
                  <p className="text-sm leading-snug text-[#3c4948]">
                    Advanced analytics for high-performance clinics.
                  </p>
                </div>
              </li>
              <li className="flex gap-5">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#e0e3e5]">
                  <span className="material-symbols-outlined notranslate text-xl text-[#6063ee]">
                    hub
                  </span>
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="font-bold text-[#191c1e]">Aura Sync: Multi-branch Control</p>
                  <p className="text-sm leading-snug text-[#3c4948]">
                    Seamlessly manage data across your entire network.
                  </p>
                </div>
              </li>
            </ul>

            <div className="flex flex-wrap items-center gap-4 border-t border-[rgba(187,201,199,0.35)] pt-8">
              <div className="flex -space-x-3">
                {REGISTER_SOCIAL_PROOF.map((name) => (
                  <AuraAvatar
                    key={name}
                    name={name}
                    decorative
                    className="size-10 rounded-full border-2 border-[#f7f9fb] text-xs shadow-sm"
                  />
                ))}
              </div>
              <p className="text-base font-medium uppercase tracking-wide text-[#6c7a78]">
                Trusted by 2,400+ pharmacies
              </p>
            </div>
          </div>
        </aside>

        {/* Right: form */}
        <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-12 sm:px-12 lg:px-16 lg:py-24">
          <div className="relative w-full max-w-md">
            <div className="mb-10 inline-flex items-center gap-2 rounded-full bg-[rgba(0,106,101,0.05)] px-3 py-1.5">
              <span className="material-symbols-outlined notranslate text-sm text-[#006a65]">
                verified_user
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-[#006a65]">
                Secure Registration Portal
              </span>
            </div>

            <div className="mb-8 space-y-2">
              <h2 className="text-base font-bold text-[#191c1e] sm:text-lg">
                Start your intelligence journey
              </h2>
              <p className="text-base text-[#3c4948]">
                Access the full suite of clinical tools today.
              </p>
            </div>

            <div className="rounded-xl border border-[rgba(187,201,199,0.15)] bg-white p-1 shadow-[0_0_0_1px_rgba(187,201,199,0.1),0_1px_2px_0_rgba(0,0,0,0.05)]">
              <form
                className={`flex flex-col gap-6 p-6 transition sm:p-8 ${isBusy ? "opacity-75" : ""}`}
                onSubmit={handleSubmit}
                aria-busy={isBusy}
              >
                <fieldset disabled={isBusy} className="contents">
                  <div>
                    <RegisterFieldLabel htmlFor="fullName">Full name</RegisterFieldLabel>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      autoComplete="name"
                      placeholder="Dr. Sarah Mitchell"
                      className={inputClass}
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <RegisterFieldLabel htmlFor="pharmacyName">Pharmacy name</RegisterFieldLabel>
                    <input
                      id="pharmacyName"
                      name="pharmacyName"
                      type="text"
                      autoComplete="organization"
                      placeholder="Aura Healthcare Ltd."
                      className={inputClass}
                      value={pharmacyName}
                      onChange={(event) => setPharmacyName(event.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <RegisterFieldLabel htmlFor="email">Email address</RegisterFieldLabel>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="sarah@aurapharma.com"
                      className={inputClass}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <RegisterFieldLabel htmlFor="password">Password</RegisterFieldLabel>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        minLength={8}
                        className={`${inputClass} pr-12`}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[#6c7a78] transition hover:bg-[#e0e3e5]/80 hover:text-[#191c1e] disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        <span className="material-symbols-outlined notranslate text-xl">
                          {showPassword ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                  </div>
                </fieldset>

                <div className="space-y-6 pt-2">
                  {error ? (
                    <AuraInlineAlert
                      variant="error"
                      title="Registration could not be completed"
                      description={error}
                    />
                  ) : null}
                  {info ? (
                    <AuraInlineAlert
                      variant="success"
                      title="Registration successful"
                      description={info}
                    />
                  ) : null}

                  <p className="text-center text-base leading-relaxed text-[#bbc9c7]">
                    By signing up, you agree to the{" "}
                    <Link href="#" className="text-[#006a65] hover:underline">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="#" className="text-[#006a65] hover:underline">
                      Privacy Policy
                    </Link>
                    .
                  </p>

                  <button
                    type="submit"
                    disabled={isBusy}
                    className="relative flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0fb9b1] to-[#6063ee] py-4 text-base font-semibold text-white shadow-[0_20px_25px_-5px_rgba(15,185,177,0.2),0_8px_10px_-6px_rgba(15,185,177,0.2)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {signUpMutation.isPending ? "Creating Account..." : "Start Your Free Trial"}
                    <span className="material-symbols-outlined notranslate text-base">
                      arrow_forward
                    </span>
                  </button>
                </div>
              </form>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-8 opacity-60">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined notranslate text-lg text-[#191c1e]">
                  lock
                </span>
                <span className="text-xs font-semibold uppercase text-[#191c1e]">
                  SSL Secure
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined notranslate text-lg text-[#191c1e]">
                  shield
                </span>
                <span className="text-xs font-semibold uppercase text-[#191c1e]">
                  HIPAA Ready
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
