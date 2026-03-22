import Image from "next/image";

const HIPAA_BADGE =
  "https://www.figma.com/api/mcp/asset/4c226b3c-5eb2-436a-a81b-264e43911a2c";
const SOC2_BADGE =
  "https://www.figma.com/api/mcp/asset/edc5e857-b157-4ea7-8f85-8b932b5c5e7a";

export function LicenseVerificationAside() {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-[rgba(187,201,199,0.1)] bg-[#f2f4f6] p-6">
        <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[#3c4948]">
          Verification Tracker
        </h3>
        <div className="relative mt-8 space-y-8 pl-2">
          <div
            className="absolute bottom-2 left-[11px] top-2 w-0.5 bg-gradient-to-b from-[#006a65] to-[#e6e8ea]"
            aria-hidden
          />
          <div className="relative flex gap-4">
            <div className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#006a65] shadow-[0_1px_2px_0_rgba(0,106,101,0.4)]">
              <span className="material-symbols-outlined notranslate text-xs text-white">
                check
              </span>
            </div>
            <div>
              <p className="font-[family-name:var(--font-manrope)] text-sm font-bold text-[#191c1e]">
                Identity Verified
              </p>
              <p className="text-xs font-medium text-[#006a65]">Completed</p>
            </div>
          </div>
          <div className="relative flex gap-4">
            <div className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-[#006a65] bg-white p-0.5">
              <span className="size-2 rounded-full bg-[#006a65]" />
            </div>
            <div>
              <p className="font-[family-name:var(--font-manrope)] text-sm font-bold text-[#191c1e]">
                Pharmacy License
              </p>
              <p className="text-xs font-medium text-[#7b2f05]">Awaiting Upload</p>
            </div>
          </div>
          <div className="relative flex gap-4">
            <div className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#e6e8ea]">
              <span className="material-symbols-outlined notranslate text-sm text-[#64748b]">
                hourglass_empty
              </span>
            </div>
            <div>
              <p className="font-[family-name:var(--font-manrope)] text-sm font-bold text-[#3c4948]">
                PIC Certification
              </p>
              <p className="text-xs font-medium text-[#94a3b8]">Verifying...</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative rounded-xl border border-[rgba(15,185,177,0.1)] bg-white p-6 shadow-[0_0_40px_-10px_rgba(15,185,177,0.15)]">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined notranslate text-[#006a65]">shield_lock</span>
          <h3 className="font-[family-name:var(--font-manrope)] text-sm font-bold text-[#191c1e]">
            Medical-Grade Trust
          </h3>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-[#3c4948]">
          All documents are encrypted using AES-256 protocols and stored in SOC2-compliant HIPAA
          environments. Your data is only accessible to authorized clinical verification
          specialists.
        </p>
        <div className="mt-4 flex gap-3 opacity-70">
          <div className="relative h-6 w-12 overflow-hidden rounded bg-[#e6e8ea]">
            <Image src={HIPAA_BADGE} alt="HIPAA" fill className="object-contain p-0.5" sizes="48px" />
          </div>
          <div className="relative h-6 w-12 overflow-hidden rounded bg-[#e6e8ea]">
            <Image src={SOC2_BADGE} alt="SOC 2" fill className="object-contain p-0.5" sizes="48px" />
          </div>
        </div>
      </div>

      <div
        className="rounded-xl border border-[rgba(187,201,199,0.1)] p-6"
        style={{
          background:
            "linear-gradient(135deg, rgb(247, 249, 251) 0%, rgb(242, 244, 246) 100%)",
        }}
      >
        <p className="text-sm leading-relaxed text-[#3c4948]">
          &ldquo;Verification usually takes 12-24 business hours. You can proceed with the rest of
          your onboarding while we review these.&rdquo;
        </p>
      </div>
    </div>
  );
}
