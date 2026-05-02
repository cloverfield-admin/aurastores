import { AURA_ASSETS } from "@/lib/aura-assets";

export type AppLogoVariant = "sidebar" | "header" | "bar" | "auth" | "footer";

const VARIANT_CLASS: Record<AppLogoVariant, string> = {
  /** Dashboard / review sidebars (~256px wide). */
  sidebar:
    "h-10 w-auto max-w-full object-contain object-left sm:h-11 lg:h-12",
  /** Marketing site header — scales with viewport without crowding nav. */
  header:
    "h-9 w-auto max-w-[min(72vw,15rem)] object-contain object-left sm:h-10 sm:max-w-[17rem] md:h-11 md:max-w-[20rem]",
  /** Fixed top bars (`h-16`); keep vertical room for padding. */
  bar: "h-10 w-auto max-w-[min(72vw,15rem)] object-contain object-left sm:h-11 sm:max-w-[17rem]",
  /** Auth hero — primary brand read at arm’s length on phones. */
  auth: "mx-auto h-12 w-auto max-w-[min(94vw,22rem)] object-contain sm:h-14 sm:max-w-[26rem] md:h-16 md:max-w-[30rem]",
  /** Marketing footer column. */
  footer: "h-11 w-auto max-w-[15rem] object-contain object-left sm:h-12 sm:max-w-[18rem] md:h-14 md:max-w-[22rem]",
};

type AppLogoProps = {
  variant: AppLogoVariant;
  className?: string;
};

/**
 * Aura Stores wordmark from `public/aura_stores_logo.svg`.
 * Use `variant` for preset responsive sizing; extend with `className` when needed.
 */
export function AppLogo({ variant, className = "" }: AppLogoProps) {
  return (
    <img
      src={AURA_ASSETS.appLogoWordmark}
      alt="Aura Stores"
      width={680}
      height={420}
      decoding="async"
      className={`${VARIANT_CLASS[variant]} ${className}`.trim()}
    />
  );
}
