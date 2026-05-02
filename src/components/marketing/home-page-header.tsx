import { getCurrentSupabaseUser } from "@/lib/auth/session";
import { HomePageHeaderClient } from "@/components/marketing/home-page-header.client";

export async function HomePageHeader() {
  const user = await getCurrentSupabaseUser();
  return <HomePageHeaderClient isAuthenticated={Boolean(user)} />;
}
