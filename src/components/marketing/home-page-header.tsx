import { HomePageHeaderClient } from "@/components/marketing/home-page-header.client";

/**
 * The marketing header no longer carries an auth link (the web app is the platform
 * console; store owners use the mobile app), so it no longer needs to know whether
 * anyone is signed in — which also drops a Supabase auth call from every render of
 * the public homepage.
 */
export function HomePageHeader() {
  return <HomePageHeaderClient />;
}
