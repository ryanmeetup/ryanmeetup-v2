"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Components
import Map, { Marker, Popup } from "react-map-gl";
import NextImage from "next/image";
import { Heading, Text } from "@/components/global";
import { Legend } from "@/components/map";
import { FaMapPin as Pin } from "react-icons/fa";
import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

// Types
import type { Location } from "@/lib/types";

// Utilities
import "mapbox-gl/dist/mapbox-gl.css";
import { convertImageUrl } from "@/utils/convert";
import { formatEventDate } from "@/utils/date";

type MapboxProps = {
  locations: Location[];
  showLegend?: boolean;
  initialShowMeetups?: boolean;
  initialShowRyans?: boolean;
  initialShowNamedBusinesses?: boolean;
  initialShowOwnedBusinesses?: boolean;
  initialShowChapters?: boolean;
};

const Mapbox = (props: MapboxProps) => {
  const {
    locations,
    showLegend = true,
    initialShowMeetups = true,
    initialShowRyans = true,
    initialShowNamedBusinesses = true,
    initialShowOwnedBusinesses = true,
    initialShowChapters = true,
  } = props;

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const isTestMode = process.env.NEXT_PUBLIC_E2E_TESTS === "true";
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasMounted = useRef(false);

  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null,
  );
  const [showRyans, setShowRyans] = useState<boolean>(initialShowRyans);
  const [showMeetups, setShowMeetups] = useState<boolean>(initialShowMeetups);
  const [showNamedBusinesses, setShowNamedBusinesses] = useState<boolean>(
    initialShowNamedBusinesses,
  );
  const [showOwnedBusinesses, setShowOwnedBusinesses] = useState<boolean>(
    initialShowOwnedBusinesses,
  );
  const [showChapters, setShowChapters] = useState<boolean>(initialShowChapters);
  const [showLegendVisible, setShowLegendVisible] =
    useState<boolean>(showLegend);
  const [legendCollapsed, setLegendCollapsed] = useState<boolean>(false);
  const [currentZoom, setCurrentZoom] = useState<number>(3.5);

  useEffect(() => {
    if (isTestMode) {
      return;
    }

    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    const params = new URLSearchParams(searchParams?.toString());
    const desiredParams = [
      ["legend", showLegendVisible ? "1" : "0"],
      ["meetups", showMeetups ? "1" : "0"],
      ["hubs", showRyans ? "1" : "0"],
      ["named", showNamedBusinesses ? "1" : "0"],
      ["owned", showOwnedBusinesses ? "1" : "0"],
      ["chapters", showChapters ? "1" : "0"],
    ] as const;

    let hasChanges = false;
    desiredParams.forEach(([key, value]) => {
      if (params.get(key) !== value) {
        params.set(key, value);
        hasChanges = true;
      }
    });

    if (!hasChanges) {
      return;
    }

    const nextQuery = params.toString();
    router.replace(nextQuery ? `?${nextQuery}` : "?", { scroll: false });
  }, [
    showMeetups,
    showRyans,
    showNamedBusinesses,
    showOwnedBusinesses,
    showChapters,
    showLegendVisible,
    router,
    searchParams,
    isTestMode,
  ]);

  const groupedLocations = useMemo(() => {
    return locations.reduce(
      (acc, location) => {
        switch (location.locationType) {
          case "Event Location":
            acc.meetups.push(location);
            break;
          case "Ryan Hub":
            acc.hubs.push(location);
            break;
          case "Ryan-Named Business":
            acc.namedBusinesses.push(location);
            break;
          case "Ryan-Owned Business":
            acc.ownedBusinesses.push(location);
            break;
          case "Chapter":
            acc.chapters.push(location);
            break;
        }
        return acc;
      },
      {
        meetups: [] as Location[],
        hubs: [] as Location[],
        namedBusinesses: [] as Location[],
        ownedBusinesses: [] as Location[],
        chapters: [] as Location[],
      },
    );
  }, [locations]);

  const renderIcon = useCallback((type: string) => {
    switch (type) {
      case "Event Location":
        return "/icons/partiful.webp";
      case "Ryan Hub":
        return "/icons/ryanicon.png";
      case "Ryan-Owned Business":
        return "/icons/brief.png";
      case "Ryan-Named Business":
        return "/icons/nametagicon.png";
      case "Chapter":
        return "/icons/invert.png";
    }
  }, []);

  const isBusiness = useMemo(() => {
    return (
      selectedLocation?.locationType === "Ryan-Named Business" ||
      selectedLocation?.locationType === "Ryan-Owned Business"
    );
  }, [selectedLocation]);
  const isChapter = useMemo(() => {
    return selectedLocation?.locationType === "Chapter";
  }, [selectedLocation]);

  const convertToSlug = useCallback((city: string) => {
    let sanitized = city.substring(0, city.indexOf(",")).toLowerCase();

    return sanitized.replaceAll(" ", "-");
  }, []);

  const markerSize = useMemo(() => {
    if (currentZoom <= 2) {
      return 22;
    }

    if (currentZoom <= 2.5) {
      return 25;
    }

    if (currentZoom <= 3) {
      return 28;
    }

    if (currentZoom <= 4) {
      return 32;
    }

    return 36;
  }, [currentZoom]);

  const markerIconSize = useMemo(() => {
    return Math.max(14, Math.round(markerSize * 0.56));
  }, [markerSize]);

  const markerWrapClass =
    "flex items-center justify-center rounded-full border border-black/15 bg-white shadow-md transition-transform hover:scale-110";
  const markerImageClass = "object-contain";

  if (isTestMode) {
    return (
      <div className="relative w-full h-[600px] md:h-[700px]">
        <div data-testid="map-markers" className="p-4 space-y-2">
          {showMeetups &&
            groupedLocations.meetups.map((location) => (
              <div
                key={`meetup-${location.locationName}`}
                data-testid="marker-meetup"
              >
                {location.locationName}
              </div>
            ))}
          {showRyans &&
            groupedLocations.hubs.map((location) => (
              <div
                key={`hub-${location.locationName}`}
                data-testid="marker-hub"
              >
                {location.locationName}
              </div>
            ))}
          {showNamedBusinesses &&
            groupedLocations.namedBusinesses.map((location) => (
              <div
                key={`named-${location.locationName}`}
                data-testid="marker-named-business"
              >
                {location.locationName}
              </div>
            ))}
          {showOwnedBusinesses &&
            groupedLocations.ownedBusinesses.map((location) => (
              <div
                key={`owned-${location.locationName}`}
                data-testid="marker-owned-business"
              >
                {location.locationName}
              </div>
            ))}
          {showChapters &&
            groupedLocations.chapters.map((location) => (
              <div
                key={`chapter-${location.locationName}`}
                data-testid="marker-chapter"
              >
                {location.locationName}
              </div>
            ))}
        </div>

        {showLegendVisible && (
          <Legend
            showMeetups={showMeetups}
            showRyans={showRyans}
            showNamedBusinesses={showNamedBusinesses}
            showOwnedBusinesses={showOwnedBusinesses}
            showChapters={showChapters}
            isCollapsed={legendCollapsed}
            onToggleCollapse={() => setLegendCollapsed((prev) => !prev)}
            setShowMeetups={setShowMeetups}
            setShowRyans={setShowRyans}
            setShowNamedBusinesses={setShowNamedBusinesses}
            setShowOwnedBusinesses={setShowOwnedBusinesses}
            setShowChapters={setShowChapters}
          />
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] md:h-[700px] border-b-4 border-black/20 dark:border-white/10">
      <Map
        mapboxAccessToken={token}
        initialViewState={{
          latitude: 40,
          longitude: -100,
          zoom: 3.5,
          bearing: 0,
          pitch: 0,
        }}
        mapStyle="mapbox://styles/mapbox/streets-v9"
        onZoom={(event) => setCurrentZoom(event.viewState.zoom)}
      >
        {showRyans &&
          groupedLocations.hubs.map((location) => (
            <Marker
              key={location.locationName}
              latitude={location.coordinates.lat}
              longitude={location.coordinates.lon}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedLocation(location);
              }}
            >
              <div
                className={markerWrapClass}
                style={{ width: markerSize, height: markerSize }}
              >
                <NextImage
                  src={renderIcon(location.locationType) as string}
                  alt={location.locationType}
                  width={markerIconSize}
                  height={markerIconSize}
                  className={markerImageClass}
                />
              </div>
            </Marker>
          ))}

        {showMeetups &&
          groupedLocations.meetups.map((location) => (
            <Marker
              key={location.locationName}
              latitude={location.coordinates.lat}
              longitude={location.coordinates.lon}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedLocation(location);
              }}
            >
              <div
                className={markerWrapClass}
                style={{ width: markerSize, height: markerSize }}
              >
                <NextImage
                  src={renderIcon(location.locationType) as string}
                  alt={location.locationType}
                  width={markerIconSize}
                  height={markerIconSize}
                  className={markerImageClass}
                />
              </div>
            </Marker>
          ))}

        {showNamedBusinesses &&
          groupedLocations.namedBusinesses.map((location) => (
            <Marker
              key={location.locationName}
              latitude={location.coordinates.lat}
              longitude={location.coordinates.lon}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedLocation(location);
              }}
            >
              <div
                className={markerWrapClass}
                style={{ width: markerSize, height: markerSize }}
              >
                <NextImage
                  src={renderIcon(location.locationType) as string}
                  alt={location.locationType}
                  width={markerIconSize}
                  height={markerIconSize}
                  className={markerImageClass}
                />
              </div>
            </Marker>
          ))}

        {showOwnedBusinesses &&
          groupedLocations.ownedBusinesses.map((location) => (
            <Marker
              key={location.locationName}
              latitude={location.coordinates.lat}
              longitude={location.coordinates.lon}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedLocation(location);
              }}
            >
              <div
                className={markerWrapClass}
                style={{ width: markerSize, height: markerSize }}
              >
                <NextImage
                  src={renderIcon(location.locationType) as string}
                  alt={location.locationType}
                  width={markerIconSize}
                  height={markerIconSize}
                  className={markerImageClass}
                />
              </div>
            </Marker>
          ))}

        {selectedLocation && (
          <Popup
            latitude={selectedLocation.coordinates.lat}
            longitude={selectedLocation.coordinates.lon}
            onClose={() => setSelectedLocation(null)}
            closeButton={false}
            className="map-popup"
          >
            <div className="rounded-[20px] bg-white p-4 text-black">
              {selectedLocation.image && (
                <NextImage
                  className="mb-3 rounded-2xl"
                  src={
                    convertImageUrl(selectedLocation.image) ?? "/trophy.webp"
                  }
                  alt={selectedLocation.eventName}
                  width={180}
                  height={180}
                />
              )}

              <Heading className="text-base text-black" size="h3">
                {isChapter
                  ? (selectedLocation.locationName ?? selectedLocation.city)
                  : isBusiness
                    ? selectedLocation.locationName
                    : (selectedLocation.eventName ?? selectedLocation.city)}
              </Heading>
              <p className="text-xs leading-relaxed tracking-wide text-black/70">
                {isChapter && (
                  <span className="mt-1 flex items-center gap-1">
                    <Pin className="fill-red-500" />{" "}
                    {selectedLocation.city}
                  </span>
                )}
                {isBusiness && (
                  <>
                    <span>{selectedLocation.locationType}</span>
                    <span className="mt-1 flex items-center gap-1">
                      <Pin className="fill-red-500" />{" "}
                      {selectedLocation.city}
                    </span>
                  </>
                )}
                {selectedLocation.eventDate && (
                  <span className="-mt-1 text-black/70">
                    {formatEventDate(selectedLocation.eventDate)}{" "}
                    •
                  </span>
                )}{" "}
                {selectedLocation.eventName ? selectedLocation.city : ""}
              </p>
              {isChapter && (
                <NextLink
                  className="mt-4 inline-flex items-center font-sans text-sm font-semibold tracking-wide text-black transition hover:text-black/70"
                  href={`/chapters/${convertToSlug(selectedLocation.city)}`}
                >
                  View chapter
                </NextLink>
              )}
            </div>
          </Popup>
        )}

        {showChapters &&
          groupedLocations.chapters.map((location) => (
            <Marker
              key={location.locationName}
              latitude={location.coordinates.lat}
              longitude={location.coordinates.lon}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedLocation(location);
              }}
            >
              <button
                type="button"
                className={markerWrapClass}
                style={{ width: markerSize, height: markerSize }}
                aria-label={`${location.city} chapter`}
              >
                <span
                  className="leading-none"
                  style={{ fontSize: Math.max(14, Math.round(markerSize * 0.44)) }}
                >
                  📍
                </span>
              </button>
            </Marker>
          ))}

        {showLegendVisible && (
          <Legend
            showMeetups={showMeetups}
            showRyans={showRyans}
            showNamedBusinesses={showNamedBusinesses}
            showOwnedBusinesses={showOwnedBusinesses}
            showChapters={showChapters}
            isCollapsed={legendCollapsed}
            onToggleCollapse={() => setLegendCollapsed((prev) => !prev)}
            setShowMeetups={setShowMeetups}
            setShowRyans={setShowRyans}
            setShowNamedBusinesses={setShowNamedBusinesses}
            setShowOwnedBusinesses={setShowOwnedBusinesses}
            setShowChapters={setShowChapters}
          />
        )}
      </Map>
    </div>
  );
};

export { Mapbox };
