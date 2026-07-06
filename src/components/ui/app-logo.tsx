import { AURA_ASSETS } from "@/lib/aura-assets";

export type AppLogoVariant = "sidebar" | "header" | "bar" | "auth" | "footer";

const FONT_DISPLAY = "var(--font-schibsted), 'Schibsted Grotesk', sans-serif";

/** Per-surface sizing for the mark (px, square) and wordmark text (px). */
const VARIANT: Record<AppLogoVariant, { mark: number; text: number; gap: number }> = {
  /** Dashboard / review sidebars (~256px wide). */
  sidebar: { mark: 40, text: 25, gap: 11 },
  /** Marketing site header. */
  header: { mark: 34, text: 21, gap: 10 },
  /** Fixed top bars (onboarding / register). */
  bar: { mark: 32, text: 20, gap: 10 },
  /** Auth hero — primary brand read at arm's length on phones. */
  auth: { mark: 46, text: 30, gap: 12 },
  /** Marketing footer column. */
  footer: { mark: 40, text: 24, gap: 11 },
};

type AppLogoProps = {
  variant: AppLogoVariant;
  className?: string;
};

/**
 * AuraStores brand lockup — deep-teal monogram mark + two-tone `aurastores`
 * wordmark (Schibsted Grotesk). The mark tile and mint "stores" read on both
 * light and dark surfaces; the "aura" half flips to a light tint in dark mode.
 * Use `variant` for preset sizing; extend layout with `className`.
 */
export function AppLogo({ variant, className = "" }: AppLogoProps) {
  const cfg = VARIANT[variant];
  return (
    <span className={`inline-flex items-center ${className}`.trim()} style={{ gap: cfg.gap }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={AURA_ASSETS.logoMark}
        alt=""
        width={cfg.mark}
        height={cfg.mark}
        decoding="async"
        style={{ width: cfg.mark, height: cfg.mark, display: "block", flexShrink: 0 }}
      />
      <span
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: cfg.text,
          letterSpacing: "-0.03em",
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        <span className="font-extrabold text-[#07322e] dark:text-[#e8eaed]">aura</span>
        <span className="font-medium text-[#4da899]">stores</span>
      </span>
    </span>
  );
}
