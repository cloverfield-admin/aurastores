"use client";

import {
  AdvancedMarker,
  APIProvider,
  Map,
  Marker,
  Pin,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { useCallback, useEffect, useRef, useState } from "react";
import { getGoogleMapsApiKey, getGoogleMapsMapId } from "@/lib/google-maps-env";

const US_CENTER = { lat: 39.8283, lng: -98.5795 };

export type BranchLocationPickerProps = {
  className?: string;
  initialLatitude: number | null;
  initialLongitude: number | null;
  onPick: (latitude: number, longitude: number) => void;
  /** When the user picks a place from search, formatted address for the branch field */
  onResolvedAddress?: (formattedAddress: string) => void;
};

type GmpSelectEvent = Event & {
  placePrediction: { toPlace: () => google.maps.places.Place };
};

function readLatLng(loc: google.maps.LatLng | google.maps.LatLngLiteral | null | undefined) {
  if (!loc) {
    return null;
  }
  if (typeof (loc as google.maps.LatLng).lat === "function") {
    const ll = loc as google.maps.LatLng;
    return { lat: ll.lat(), lng: ll.lng() };
  }
  const literal = loc as google.maps.LatLngLiteral;
  return { lat: literal.lat, lng: literal.lng };
}

function MapSearchInput({
  onPicked,
}: {
  onPicked: (lat: number, lng: number, formattedAddress?: string) => void;
}) {
  const map = useMap();
  const placesLib = useMapsLibrary("places");
  const containerRef = useRef<HTMLDivElement>(null);
  const onPickedRef = useRef(onPicked);

  useEffect(() => {
    onPickedRef.current = onPicked;
  }, [onPicked]);

  useEffect(() => {
    if (!placesLib || !map || !containerRef.current) {
      return;
    }

    const Ctor = google.maps.places.PlaceAutocompleteElement;
    if (!Ctor) {
      return;
    }

    const bounds = map.getBounds();
    const autocompleteEl = new Ctor(
      bounds
        ? {
            locationBias: bounds,
          }
        : {},
    );

    autocompleteEl.className = "aura-place-autocomplete w-full text-sm";

    const onSelect = async (event: Event) => {
      const { placePrediction } = event as GmpSelectEvent;
      if (!placePrediction) {
        return;
      }
      const place = placePrediction.toPlace();
      await place.fetchFields({
        fields: ["formattedAddress", "location", "viewport"],
      });

      const coords = readLatLng(place.location ?? null);
      if (!coords) {
        return;
      }

      const { lat, lng } = coords;
      if (place.viewport) {
        map.fitBounds(place.viewport);
      } else {
        map.panTo({ lat, lng });
        map.setZoom(17);
      }

      const formatted = place.formattedAddress?.trim();
      onPickedRef.current(lat, lng, formatted || undefined);
    };

    autocompleteEl.addEventListener("gmp-select", onSelect as EventListener);

    containerRef.current.appendChild(autocompleteEl);

    return () => {
      autocompleteEl.removeEventListener("gmp-select", onSelect as EventListener);
      autocompleteEl.remove();
    };
  }, [placesLib, map]);

  return <div ref={containerRef} className="min-h-[42px] min-w-0 w-full" />;
}

function LocationMap({
  initialLatitude,
  initialLongitude,
  onPick,
  onResolvedAddress,
  mapId,
}: {
  initialLatitude: number | null;
  initialLongitude: number | null;
  onPick: (latitude: number, longitude: number) => void;
  onResolvedAddress?: (formattedAddress: string) => void;
  mapId: string | undefined;
}) {
  const hasInitial =
    initialLatitude != null &&
    initialLongitude != null &&
    Number.isFinite(initialLatitude) &&
    Number.isFinite(initialLongitude);

  const defaultCenter = hasInitial
    ? { lat: initialLatitude as number, lng: initialLongitude as number }
    : US_CENTER;
  const defaultZoom = hasInitial ? 15 : 4;

  const handleSearchPick = useCallback(
    (lat: number, lng: number, formattedAddress?: string) => {
      onPick(lat, lng);
      if (formattedAddress?.trim()) {
        onResolvedAddress?.(formattedAddress.trim());
      }
    },
    [onPick, onResolvedAddress],
  );

  const handleMapClick = useCallback(
    (event: { detail: { latLng: google.maps.LatLngLiteral | null } }) => {
      const ll = event.detail.latLng;
      if (!ll) {
        return;
      }
      onPick(ll.lat, ll.lng);
    },
    [onPick],
  );

  const markerPosition = hasInitial ? { lat: initialLatitude as number, lng: initialLongitude as number } : null;

  const [satellite, setSatellite] = useState(false);

  return (
    <Map
      className="h-full w-full"
      defaultCenter={defaultCenter}
      defaultZoom={defaultZoom}
      mapId={mapId}
      mapTypeId={satellite ? "hybrid" : "roadmap"}
      mapTypeControl={false}
      gestureHandling="greedy"
      clickableIcons={false}
      onClick={handleMapClick}
    >
      <div className="pointer-events-none absolute inset-x-2 top-2 z-[1000] overflow-visible sm:inset-x-4 sm:top-3">
        <div className="pointer-events-auto mx-auto flex max-w-2xl flex-col gap-2 overflow-visible sm:flex-row sm:items-stretch sm:gap-2">
          <div className="min-w-0 flex-1 overflow-visible rounded-xl bg-white shadow-md ring-1 ring-black/10">
            <MapSearchInput onPicked={handleSearchPick} />
          </div>
          <button
            type="button"
            onClick={() => setSatellite((v) => !v)}
            className="pointer-events-auto flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-[#006a65] shadow-md ring-1 ring-black/10 transition hover:bg-[#f8fafc] sm:min-w-[7.5rem]"
          >
            <span className="material-symbols-outlined notranslate text-lg" aria-hidden>
              {satellite ? "map" : "satellite_alt"}
            </span>
            {satellite ? "Map" : "Satellite"}
          </button>
        </div>
      </div>

      {markerPosition ? (
        mapId ? (
          <AdvancedMarker position={markerPosition}>
            <Pin background="#006a65" glyphColor="#ffffff" />
          </AdvancedMarker>
        ) : (
          <Marker position={markerPosition} />
        )
      ) : null}
    </Map>
  );
}

function ReadOnlyBranchLocationMap({
  latitude,
  longitude,
  mapId,
}: {
  latitude: number;
  longitude: number;
  mapId: string | undefined;
}) {
  const position = { lat: latitude, lng: longitude };
  return (
    <Map
      className="h-full w-full"
      defaultCenter={position}
      defaultZoom={16}
      mapId={mapId}
      gestureHandling="cooperative"
      clickableIcons={false}
      mapTypeControl={false}
      streetViewControl={false}
    >
      {mapId ? (
        <AdvancedMarker position={position}>
          <Pin background="#006a65" glyphColor="#ffffff" />
        </AdvancedMarker>
      ) : (
        <Marker position={position} />
      )}
    </Map>
  );
}

export type BranchLocationMapPreviewProps = {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  className?: string;
};

/**
 * Read-only map centered on branch coordinates (e.g. final review). Falls back to an
 * external Google Maps link if the API key is not configured.
 */
export function BranchLocationMapPreview({
  latitude,
  longitude,
  className,
}: BranchLocationMapPreviewProps) {
  const apiKey = getGoogleMapsApiKey();
  const mapId = getGoogleMapsMapId();
  const hasCoords =
    latitude != null &&
    longitude != null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  const wrapperClass = `relative h-48 w-full overflow-hidden rounded-lg bg-[#f1f5f9] ${className ?? ""}`;

  if (!hasCoords) {
    return (
      <div
        className={`flex items-center justify-center gap-2 px-4 text-center text-sm text-[#64748b] ${wrapperClass}`}
      >
        <span className="material-symbols-outlined notranslate text-2xl text-[#94a3b8]" aria-hidden>
          location_off
        </span>
        <span>Set a map pin in pharmacy details to preview the location here.</span>
      </div>
    );
  }

  const lat = latitude as number;
  const lng = longitude as number;
  const mapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`;

  if (!apiKey) {
    return (
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex flex-col items-center justify-center gap-2 px-4 text-center transition hover:bg-[#e2e8f0] ${wrapperClass}`}
      >
        <span className="material-symbols-outlined notranslate text-2xl text-[#006a65]" aria-hidden>
          map
        </span>
        <span className="text-sm font-semibold text-[#006a65]">Open location in Google Maps</span>
        <span className="font-mono text-xs text-[#64748b]">
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </span>
      </a>
    );
  }

  return (
    <div
      className={wrapperClass}
      role="img"
      aria-label={`Map showing branch at ${lat.toFixed(5)}, ${lng.toFixed(5)}`}
    >
      <APIProvider apiKey={apiKey} libraries={["marker"]}>
        <ReadOnlyBranchLocationMap latitude={lat} longitude={lng} mapId={mapId} />
      </APIProvider>
    </div>
  );
}

export function BranchLocationPicker({
  className,
  initialLatitude,
  initialLongitude,
  onPick,
  onResolvedAddress,
}: BranchLocationPickerProps) {
  const apiKey = getGoogleMapsApiKey();
  const mapId = getGoogleMapsMapId();

  if (!apiKey) {
    return (
      <div
        className={`flex items-center justify-center bg-[#e2e8f0] px-4 py-8 text-center text-sm text-[#64748b] ${className ?? ""}`}
      >
        <p>
          Set{" "}
          <span className="rounded bg-white/80 px-1.5 py-0.5 font-mono text-xs text-[#334155]">
            GOOGLE_MAPS_API_KEY
          </span>{" "}
          in <span className="font-mono text-xs">.env.local</span> to load the map and search. For
          pins and styling, add{" "}
          <span className="rounded bg-white/80 px-1.5 py-0.5 font-mono text-xs text-[#334155]">
            GOOGLE_MAPS_MAP_ID
          </span>
          .
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <APIProvider apiKey={apiKey} libraries={["places", "marker"]}>
        <LocationMap
          initialLatitude={initialLatitude}
          initialLongitude={initialLongitude}
          onPick={onPick}
          onResolvedAddress={onResolvedAddress}
          mapId={mapId}
        />
      </APIProvider>
    </div>
  );
}
