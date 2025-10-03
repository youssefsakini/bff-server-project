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

export const getStaticRepositoryController = asyncHandler(async (req, res) => {
  const repository = {
    attachmentTypes: ["CIN", "Passeport", "Carte séjour", "Raison sociale"],
    sexes: ["Femme", "Homme"],
    jobs: [
      "Ingénieur",
      "Médecin",
      "Professeur",
      "Commerçant",
      "Étudiant",
      "Autre",
    ],
    usageTypes: ["A/C1", "C2", "2 Roues", "Divers"],
    vehicleTypes: ["Voiture", "Camion", "Moto", "Bus"],
    contractDurations: ["1 an", "2 ans", "3 ans"],
    familyStatus: ["Célibataire", "Marié", "Divorcé", "Veuf"],
  };

  res.json(
    new ApiResponse(200, repository, "Static repository retrieved successfully")
  );
});

// -------- Countries ----------
export const getCountriesController = asyncHandler(async (req, res) => {
  const response = await fetch(`${COUNTRIES_API_URL}`);

  if (!response.ok) {
    throw new ApiError(
      500,
      `Countries API failed with status: ${response.status}`
    );
  }

  const data = await response.json();

  if (!data.data) {
    throw new ApiError(500, "Unexpected countries API response structure");
  }

  const countries = data.data.map((c) => c.name);

  res.json(new ApiResponse(200, countries, "Countries retrieved successfully"));
});

export const getCitiesByCountryController = asyncHandler(async (req, res) => {
  const { country } = req.params;

  if (!country) {
    throw new ApiError(400, "Missing country path parameter");
  }

  const response = await fetch(`${CITIES_API_URL}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ country }),
  });

  if (!response.ok) {
    throw new ApiError(
      500,
      `Cities API failed with status: ${response.status}`
    );
  }

  const data = await response.json();

  res.json(
    new ApiResponse(200, data.data || [], "Cities retrieved successfully")
  );
});

// -------- Cars ----------
export const getCarBrandsController = asyncHandler(async (req, res) => {
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

    const brands = json.Makes.map((m) => m.make_display);

    res.json(new ApiResponse(200, brands, "Car brands retrieved successfully"));
  } catch (parseError) {
    throw new ApiError(500, "Failed to parse car brands API response");
  }
});

export const getCarModelsController = asyncHandler(async (req, res) => {
  const { brand } = req.params;

  if (!brand) {
    throw new ApiError(400, "Missing brand path parameter");
  }

  const response = await fetch(`${CAR_MODELS_API_URL}${brand}`);

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

    const models = json.Models.map((m) => m.model_name);

    res.json(new ApiResponse(200, models, "Car models retrieved successfully"));
  } catch (parseError) {
    throw new ApiError(500, "Failed to parse car models API response");
  }
});
