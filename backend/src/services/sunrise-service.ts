/**
 * Sunrise / sunset calculation service.
 *
 * Uses a simplified astronomical algorithm to compute sunrise, sunset,
 * aeronautical dawn and aeronautical dusk for a given date and ICAO
 * airfield location.  Results are cached in the `sunrise_sunset_cache`
 * table so the calculation is only performed once per date/airfield pair.
 *
 * Reference: NOAA Solar Calculations
 * https://gml.noaa.gov/grad/solcalc/solareqns.PDF
 */

import { prisma } from '../utils/prisma.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SunTimes {
  readonly sunrise: Date | null;
  readonly sunset: Date | null;
  readonly aeroDawn: Date | null;
  readonly aeroDusk: Date | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/** Standard sunrise/sunset: center of sun at -0.833 degrees (accounting for refraction). */
const SUNRISE_ZENITH = 90.833;

/** Aeronautical twilight: center of sun at -12 degrees below horizon. */
const AERO_TWILIGHT_ZENITH = 102;

// ---------------------------------------------------------------------------
// Solar calculation (pure functions)
// ---------------------------------------------------------------------------

function dayOfYear(date: Date): number {
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000) + 1;
}

function computeSunEvent(
  doy: number,
  latitude: number,
  longitude: number,
  zenith: number,
  isRise: boolean,
  year: number,
): Date | null {
  // Step 1: approximate time
  const lngHour = longitude / 15;
  const t = isRise
    ? doy + (6 - lngHour) / 24
    : doy + (18 - lngHour) / 24;

  // Step 2: sun's mean anomaly
  const M = 0.9856 * t - 3.289;

  // Step 3: sun's true longitude
  let L =
    M +
    1.916 * Math.sin(M * DEG_TO_RAD) +
    0.02 * Math.sin(2 * M * DEG_TO_RAD) +
    282.634;
  L = ((L % 360) + 360) % 360;

  // Step 4: sun's right ascension
  let RA = RAD_TO_DEG * Math.atan(0.91764 * Math.tan(L * DEG_TO_RAD));
  RA = ((RA % 360) + 360) % 360;

  // Adjust RA to same quadrant as L
  const lQuadrant = Math.floor(L / 90) * 90;
  const raQuadrant = Math.floor(RA / 90) * 90;
  RA = RA + (lQuadrant - raQuadrant);
  RA = RA / 15; // convert to hours

  // Step 5: sun's declination
  const sinDec = 0.39782 * Math.sin(L * DEG_TO_RAD);
  const cosDec = Math.cos(Math.asin(sinDec));

  // Step 6: sun's local hour angle
  const cosH =
    (Math.cos(zenith * DEG_TO_RAD) - sinDec * Math.sin(latitude * DEG_TO_RAD)) /
    (cosDec * Math.cos(latitude * DEG_TO_RAD));

  // Sun never rises/sets at this location on this date
  if (cosH > 1 || cosH < -1) {
    return null;
  }

  const H = isRise
    ? 360 - RAD_TO_DEG * Math.acos(cosH)
    : RAD_TO_DEG * Math.acos(cosH);
  const Hhours = H / 15;

  // Step 7: local mean time of event
  const T = Hhours + RA - 0.06571 * t - 6.622;

  // Step 8: UTC
  let UT = T - lngHour;
  UT = ((UT % 24) + 24) % 24;

  const hours = Math.floor(UT);
  const minutes = Math.round((UT - hours) * 60);

  return new Date(Date.UTC(year, 0, doy - 1, hours, minutes, 0));
}

function computeSunTimes(
  date: Date,
  latitude: number,
  longitude: number,
): SunTimes {
  const doy = dayOfYear(date);
  const year = date.getUTCFullYear();

  return {
    sunrise: computeSunEvent(doy, latitude, longitude, SUNRISE_ZENITH, true, year),
    sunset: computeSunEvent(doy, latitude, longitude, SUNRISE_ZENITH, false, year),
    aeroDawn: computeSunEvent(doy, latitude, longitude, AERO_TWILIGHT_ZENITH, true, year),
    aeroDusk: computeSunEvent(doy, latitude, longitude, AERO_TWILIGHT_ZENITH, false, year),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get sunrise/sunset data for a date and ICAO code.
 * Checks the cache first; calculates and stores if not found.
 */
export const getSunriseSunset = async (
  date: Date,
  icaoCode: string,
): Promise<SunTimes> => {
  const dateOnly = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

  // Check cache
  const cached = await prisma.sunriseSunsetCache.findUnique({
    where: {
      date_icaoCode: { date: dateOnly, icaoCode },
    },
  });

  if (cached) {
    return {
      sunrise: cached.sunrise,
      sunset: cached.sunset,
      aeroDawn: cached.aeroDawn,
      aeroDusk: cached.aeroDusk,
    };
  }

  // Look up airfield coordinates
  const airfield = await prisma.icaoAirfield.findUnique({
    where: { icaoCode },
  });

  if (!airfield) {
    return { sunrise: null, sunset: null, aeroDawn: null, aeroDusk: null };
  }

  const lat = Number(airfield.latitude);
  const lng = Number(airfield.longitude);
  const times = computeSunTimes(dateOnly, lat, lng);

  // Cache the result
  await prisma.sunriseSunsetCache.create({
    data: {
      date: dateOnly,
      icaoCode,
      sunrise: times.sunrise,
      sunset: times.sunset,
      aeroDawn: times.aeroDawn,
      aeroDusk: times.aeroDusk,
    },
  });

  return times;
};
