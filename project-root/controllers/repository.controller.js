import fetch from "node-fetch";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  COUNTRIES_API_URL,
  CITIES_API_URL,
  CAR_BRANDS_API_URL,
  CAR_MODELS_API_URL,
} from "../config/config.js";

// Cache for countries data to avoid repeated API calls
let countriesCache = null;
let carBrandsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

const getCountriesData = async () => {
  const now = Date.now();
  if (
    countriesCache &&
    cacheTimestamp &&
    now - cacheTimestamp < CACHE_DURATION
  ) {
    return countriesCache;
  }

  const response = await fetch(COUNTRIES_API_URL);

  if (!response.ok) {
    throw new ApiError(
      500,
      `Countries API failed with status: ${response.status}`
    );
  }

  const data = await response.json();

  if (!data.data || !Array.isArray(data.data)) {
    throw new ApiError(500, "Unexpected countries API response structure");
  }

  // Transform and cache the data
  countriesCache = data.data.map((country, index) => ({
    id: index + 1,
    name: country.country,
    iso: country.iso2 || country.iso3 || null,
    cities: country.cities || [],
  }));

  cacheTimestamp = now;
  return countriesCache;
};

// Helper function to get car brands data
const getCarBrandsData = async () => {
  const now = Date.now();

  // Return cached data if it's still valid
  if (
    carBrandsCache &&
    cacheTimestamp &&
    now - cacheTimestamp < CACHE_DURATION
  ) {
    return carBrandsCache;
  }

  const response = await fetch(`${CAR_BRANDS_API_URL}`);

  if (!response.ok) {
    throw new ApiError(
      500,
      `Car brands API failed with status: ${response.status}`
    );
  }

  const text = await response.text();

  try {
    const json = JSON.parse(
      text.replace("var carquery = ", "").replace(";", "")
    );

    // Transform to match the desired structure
    carBrandsCache = json.Makes.map((m) => ({
      key: m.make_id,
      value: m.make_display,
    }));

    cacheTimestamp = now;
    return carBrandsCache;
  } catch (parseError) {
    throw new ApiError(500, "Failed to parse car brands API response");
  }
};

export const getStaticRepositoryController = asyncHandler(async (req, res) => {
  // Get countries and car brands data
  const countriesData = await getCountriesData();
  const carBrandsData = await getCarBrandsData();

  // Transform countries data to match the desired structure
  const countries = countriesData.map((country) => ({
    key: country.iso,
    value: country.name,
  }));

  const repository = {
    countries: countries,
    idTypes: [
      { value: "CIN", key: "CIN" },
      { value: "PASSPORT", key: "PASSPORT" },
    ],
    civilStatuses: [
      { value: "SINGLE", key: "SINGLE" },
      { value: "MARRIED", key: "MARRIED" },
      { value: "DIVORCED", key: "DIVORCED" },
    ],
    vehicleTypes: [
      { value: "CAR", key: "CAR" },
      { value: "MOTORCYCLE", key: "MOTORCYCLE" },
      { value: "SCOOTER", key: "EG" },
      { value: "AMBULANCE", key: "AMBULANCE" },
      { value: "BUS", key: "BUS" },
      { value: "TRUCK", key: "TRUCK" },
    ],
    paymentMethods: [
      { value: "CHECK", key: "CHECK" },
      { value: "CASH", key: "CASH" },
      { value: "TPE", key: "TPE" },
    ],
    durations: [
      { value: "1_YEAR", key: "1_YEAR" },
      { value: "2_YEARS", key: "2_YEARS" },
      { value: "3_YEARS", key: "3_YEARS" },
    ],
    genders: [
      { value: "MALE", key: "MALE" },
      { value: "FEMALE", key: "FEMALE" },
    ],
    vehicleBrands: carBrandsData,
    usageTypes: [
      { value: "A_C1", key: "A_C1" },
      { value: "C2", key: "C2" },
      { value: "TWO_WHEELS", key: "TWO_WHEELS" },
      { value: "VARIOUS", key: "VARIOUS" },
    ],
    occupations: [
      { value: "LAWYER", key: "LAWYER" },
      { value: "DOCTOR", key: "DOCTOR" },
      { value: "ENTREPRENEUR", key: "ENTREPRENEUR" },
      { value: "ENGINEER", key: "ENGINEER" },
      { value: "ACCOUNTANT", key: "ACCOUNTANT" },
      { value: "TEACHER", key: "TEACHER" },
    ],
  };

  res.json(
    new ApiResponse(200, repository, "Static repository retrieved successfully")
  );
});

// -------- Countries (Individual endpoints kept for backward compatibility) --------
export const getCountriesController = asyncHandler(async (req, res) => {
  const countries = await getCountriesData();

  // Return only country info without cities to keep response clean
  const countryInfo = countries.map((country) => ({
    key: country.iso,
    value: country.name,
  }));

  res.json(
    new ApiResponse(200, countryInfo, "Countries retrieved successfully")
  );
});

export const getCitiesByCountryController = asyncHandler(async (req, res) => {
  const countryIso =
    req.params.countryIso ||
    req.params.id ||
    req.params.countryCode ||
    req.params.iso;

  if (!countryIso) {
    throw new ApiError(400, "Missing country ISO code in URL path");
  }

  // Get countries data first
  const countries = await getCountriesData();

  // Find the country by ISO code
  const country = countries.find(
    (c) => c.iso && c.iso.toLowerCase() === countryIso.toLowerCase()
  );

  if (!country) {
    throw new ApiError(404, `Country with ISO code '${countryIso}' not found`);
  }

  let cities = [];

  // Check if cities are already available in countries data
  if (country.cities && country.cities.length > 0) {
    cities = country.cities.map((cityName, index) => ({
      key: `${country.id}-${index + 1}`,
      value: cityName,
    }));
  } else {
    // Fallback: fetch cities from cities API
    const citiesResponse = await fetch(`${CITIES_API_URL}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country: country.name }),
    });

    if (!citiesResponse.ok) {
      throw new ApiError(
        500,
        `Cities API failed with status: ${citiesResponse.status}`
      );
    }

    const citiesData = await citiesResponse.json();

    if (!citiesData.data || !Array.isArray(citiesData.data)) {
      throw new ApiError(500, "Unexpected cities API response structure");
    }

    cities = citiesData.data.map((cityName, index) => ({
      key: `${country.id}-${index + 1}`,
      value: cityName,
    }));
  }

  res.json(new ApiResponse(200, cities, "Cities retrieved successfully"));
});

// Get country details with cities included
export const getCountryDetailsController = asyncHandler(async (req, res) => {
  const countryIso = req.params.countryIso || req.params.id;

  if (!countryIso) {
    throw new ApiError(400, "Missing country ISO code in URL path");
  }

  const countries = await getCountriesData();
  const country = countries.find(
    (c) => c.iso && c.iso.toLowerCase() === countryIso.toLowerCase()
  );

  if (!country) {
    throw new ApiError(404, `Country with ISO code '${countryIso}' not found`);
  }

  // Ensure cities are loaded
  let cities = [];
  if (country.cities && country.cities.length > 0) {
    cities = country.cities.map((cityName, index) => ({
      key: `${country.id}-${index + 1}`,
      value: cityName,
    }));
  } else {
    // Fetch cities if not available
    const citiesResponse = await fetch(`${CITIES_API_URL}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country: country.name }),
    });

    if (citiesResponse.ok) {
      const citiesData = await citiesResponse.json();
      if (citiesData.data && Array.isArray(citiesData.data)) {
        cities = citiesData.data.map((cityName, index) => ({
          key: `${country.id}-${index + 1}`,
          value: cityName,
        }));
      }
    }
  }

  const countryDetails = {
    ...country,
    cities: cities,
  };

  res.json(
    new ApiResponse(
      200,
      countryDetails,
      "Country details retrieved successfully"
    )
  );
});

// -------- Cars (Individual endpoints kept for backward compatibility) --------
export const getCarBrandsController = asyncHandler(async (req, res) => {
  const brands = await getCarBrandsData();

  res.json(new ApiResponse(200, brands, "Car brands retrieved successfully"));
});

export const getCarModelsController = asyncHandler(async (req, res) => {
  const brandId = req.params.brandId || req.params.id;

  if (!brandId) {
    throw new ApiError(400, "Missing brandId in URL path");
  }

  const response = await fetch(`${CAR_MODELS_API_URL}${brandId}`);

  if (!response.ok) {
    throw new ApiError(
      500,
      `Car models API failed with status: ${response.status}`
    );
  }

  const text = await response.text();

  try {
    const json = JSON.parse(
      text.replace("var carquery = ", "").replace(";", "")
    );
    const models = json.Models.map((m) => ({
      key: m.model_name,
      value: m.model_name,
    }));

    res.json(new ApiResponse(200, models, "Car models retrieved successfully"));
  } catch (parseError) {
    throw new ApiError(500, "Failed to parse car models API response");
  }
});
