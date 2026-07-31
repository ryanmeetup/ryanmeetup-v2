import type { Location } from "@/lib/types";

const US_STATE_CODES = new Set([
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC",
]);

const CA_PROVINCE_CODES = new Set([
  "AB",
  "BC",
  "MB",
  "NB",
  "NL",
  "NS",
  "NT",
  "NU",
  "ON",
  "PE",
  "QC",
  "SK",
  "YT",
]);

const AU_STATE_CODES = new Set([
  "ACT",
  "NSW",
  "NT",
  "QLD",
  "SA",
  "TAS",
  "VIC",
  "WA",
]);

const COUNTRY_ALIASES = new Map(
  Object.entries({
    usa: "United States",
    "united states": "United States",
    uk: "United Kingdom",
    "united kingdom": "United Kingdom",
    england: "United Kingdom",
    scotland: "United Kingdom",
    wales: "United Kingdom",
    "northern ireland": "United Kingdom",
    aus: "Australia",
    australia: "Australia",
    ie: "Ireland",
    ireland: "Ireland",
    ph: "Philippines",
    philippines: "Philippines",
    uae: "United Arab Emirates",
    "united arab emirates": "United Arab Emirates",
  }),
);

const COUNTRY_NAMES = new Set([
  "Algeria",
  "Argentina",
  "Aruba",
  "Austria",
  "Bahrain",
  "Belgium",
  "Belize",
  "Brazil",
  "Cayman Islands",
  "Chile",
  "China",
  "Colombia",
  "Dominican Republic",
  "Ecuador",
  "El Salvador",
  "Fiji",
  "France",
  "Germany",
  "Gibraltar",
  "Hong Kong",
  "India",
  "Indonesia",
  "Isle of Man",
  "Italy",
  "Japan",
  "Kenya",
  "Lebanon",
  "Luxembourg",
  "Malaysia",
  "Malta",
  "Mauritius",
  "Netherlands",
  "New Zealand",
  "Panama",
  "Qatar",
  "Saudi Arabia",
  "Singapore",
  "South Africa",
  "Spain",
  "Sri Lanka",
  "Suriname",
  "Sweden",
  "Switzerland",
  "Taiwan",
  "Trinidad and Tobago",
  "Zimbabwe",
]);

const REGION_COUNTRIES = new Map(
  Object.entries({
    hyogo: "Japan",
    "panama city": "Panama",
    texas: "United States",
  }),
);

const normalizeToken = (value: string) =>
  value.trim().replace(/\s+/g, " ").replace(/\.+$/, "");

const getKnownCountry = (value: string) => {
  const normalized = normalizeToken(value);
  const normalizedLower = normalized.toLowerCase();
  const alias = COUNTRY_ALIASES.get(normalizedLower);
  if (alias) {
    return alias;
  }

  const knownCountry = [...COUNTRY_NAMES].find(
    (country) => country.toLowerCase() === normalizedLower,
  );
  if (knownCountry) {
    return knownCountry;
  }

  return REGION_COUNTRIES.get(normalizedLower) ?? null;
};

const getCountryFromSource = (source: string) => {
  const parts = source.split(",").map(normalizeToken).filter(Boolean);
  if (parts.length === 0) {
    return null;
  }

  const last = parts[parts.length - 1];
  const suffix = last.split(/\s+-\s+/).at(-1) ?? last;
  const knownCountry = getKnownCountry(suffix);
  if (knownCountry) {
    return knownCountry;
  }

  const lastUpper = last.toUpperCase();
  if (US_STATE_CODES.has(lastUpper)) {
    return "United States";
  }
  if (CA_PROVINCE_CODES.has(lastUpper)) {
    return "Canada";
  }
  if (AU_STATE_CODES.has(lastUpper)) {
    return "Australia";
  }

  return null;
};

const getCountryFromLocation = (location: Location) => {
  const sources = [location.city, location.locationName].filter(
    (source): source is string => Boolean(source),
  );

  for (const source of sources) {
    const country = getCountryFromSource(source);
    if (country) {
      return country;
    }
  }

  return null;
};

const formatCount = (value: number) => {
  if (value >= 1000) {
    return `${Math.round(value / 1000)}k+`;
  }
  if (value >= 100) {
    return `${Math.round(value / 10) * 10}+`;
  }
  if (value >= 20) {
    return `${Math.round(value / 5) * 5}+`;
  }
  return `${value}+`;
};

const getLocationStats = (locations: Location[]) => {
  const uniqueCities = new Set<string>();
  const uniqueCountries = new Set<string>();

  locations.forEach((location) => {
    const source = location.city || location.locationName;
    if (source) {
      const parts = source.split(",").map(normalizeToken).filter(Boolean);
      const city = parts[0]?.toLocaleLowerCase();
      const country = getCountryFromLocation(location)?.toLocaleLowerCase();
      const lastPart = parts.at(-1)?.toUpperCase();
      const region =
        parts.length >= 3
          ? parts.at(-2)?.toLocaleLowerCase()
          : lastPart &&
              (US_STATE_CODES.has(lastPart) ||
                CA_PROVINCE_CODES.has(lastPart) ||
                AU_STATE_CODES.has(lastPart))
            ? lastPart.toLocaleLowerCase()
            : "";

      if (city) {
        uniqueCities.add([city, region, country].filter(Boolean).join("|"));
      }
    }

    const country = getCountryFromLocation(location);
    if (country) {
      uniqueCountries.add(country);
    }
  });

  return {
    cityCount: uniqueCities.size,
    countryCount: uniqueCountries.size,
  };
};

export { formatCount, getLocationStats, getCountryFromLocation };
