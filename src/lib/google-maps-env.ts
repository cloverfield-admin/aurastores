/**
 * Google Maps JavaScript API (client). Set in `.env.local`:
 *
 * - `GOOGLE_MAPS_API_KEY` — required for the onboarding map
 * - `GOOGLE_MAPS_MAP_ID` — Map ID for vector maps + Advanced Markers (recommended)
 *
 * Enable APIs in Google Cloud: Maps JavaScript API, **Places API (New)** (for
 * `PlaceAutocompleteElement` / address search).
 */
export function getGoogleMapsApiKey(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";
}

export function getGoogleMapsMapId(): string | undefined {
  const id = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim();
  return id || undefined;
}
