import fetch from "node-fetch";
import { familiesData } from "../helper/data.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const getProductFamiliesController = asyncHandler(async (req, res) => {
  const { code } = req.query;
  const response = await fetch("http://localhost:5004/api/v1/product-families");
  if (!response.ok)
    throw new ApiError(500, `External API error: ${response.statusText}`);

  let { items = [] } = await response.json();
  if (code)
    items = items.filter((i) => i.code.toLowerCase() === code.toLowerCase());

  const imageMap = {
    VOYAGE: "person-placeholder.svg",
    AUTO: "auto-placeholder.svg",
    SANTE: "sante-placeholder.svg",
  };

  const transformed = items.map(({ name, ...rest }) => ({
    ...rest,
    imgUrl: imageMap[rest.code] || "default-placeholder.svg",
  }));

  res.json(
    new ApiResponse(200, transformed, "Product families retrieved successfully")
  );
});

export const getProductsByFamilyIdController = asyncHandler(
  async (req, res) => {
    const { family_id } = req.query;
    if (!family_id)
      throw new ApiError(400, "Missing family_id query parameter");

    const response = await fetch(
      `http://localhost:5004/api/v1/products?family_id=${family_id}`
    );
    if (!response.ok)
      throw new ApiError(500, `Backend API error: ${response.statusText}`);

    const { items = [] } = await response.json();
    const priceMap = {
      ISAAF_MONDE: 830,
      ISAAF_VISA_EUROPE: 1200,
      ISAAF_ETUDIANTS_EXPATRIES: 4800,
    };

    const transformed = items.map(({ name, is_base_product, ...rest }) => ({
      ...rest,
      imageUrl: "globe-placeholder.svg",
      price: priceMap[rest.code] || 0,
    }));

    res.json(
      new ApiResponse(200, transformed, "Products retrieved successfully")
    );
  }
);

export const getProductsByProductId = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  if (!productId) throw new ApiError(400, "Missing productId path parameter");

  const response = await fetch(
    `http://localhost:5004/api/v1/products/${productId}`
  );
  if (!response.ok)
    throw new ApiError(500, `Backend API error: ${response.statusText}`);

  const data = await response.json();
  const transformedCoverages = (data.coverages || []).map((coverage) => {
    const option = coverage.options?.[0] || {};
    const coverageMapping = {
      CONSEIL_MEDICAL: { code: "MEDICAL_ADVICE", category: "SANTE" },
      VISITE_MEDICALE: { code: "MEDICAL_VISIT", category: "SANTE" },
      TRANSPORT_ASSURE_ACCOMPAGNATEUR: {
        code: "MEDICAL_TRANSPORT",
        category: "SANTE",
      },
      TRANSPORT_CORPS_DECES: { code: "MEDICAL_TRANSPORT", category: "SANTE" },
      ABANDON_VEHICULE_VOYAGE: {
        code: "VEHICLE_ABANDONMENT",
        category: "AUTO",
      },
      ENVOI_CHAUFFEUR: { code: "DRIVER_SENDING", category: "AUTO" },
      ENVOI_PIECES_DETACHEES: { code: "PIECES_SENDING", category: "AUTO" },
      RAPPATRIEMENT_VEHICULE_DOMICILE: {
        code: "VEHICLE_DOMICILE",
        category: "AUTO",
      },
      RETOUR_PREMATURE: { code: "PRE_RETURN", category: "AUTO" },
      TITRE_TRANSPORT_RECUP_VEHICULE: {
        code: "TRANSPORT_TITLE",
        category: "AUTO",
      },
      REMORQUAGE: { code: "TOWING", category: "AUTO" },
      AVANCE_FONDS_REPARATION_VOITURE: {
        code: "REPAIR_ADVANCE",
        category: "AUTO",
      },
      AVANCE_ADMISSION_HOSPITALIERE: {
        code: "HOSPITAL_ADMISSION_ADVANCE",
        category: "SANTE",
      },
      FRAIS_DENTAIRES: { code: "DENTAL_EXPENSES", category: "SANTE" },
      FRAIS_MEDICAUX: { code: "MEDICAL_EXPENSES", category: "SANTE" },
      FORFAITS_FUNERAIRES: { code: "FUNERAL_ALLOWANCE", category: "VOYAGE" },
      HONORAIRES_REPRESENTANT_JUDICIAIRE: {
        code: "LEGAL_REPRESENTATIVE_FEES",
        category: "OTHER",
      },
      HEBERGEMENT: { code: "ACCOMMODATION", category: "OTHER" },
      AVANCE_CAUTION_PENALE: { code: "CAUTION_ADVANCE", category: "OTHER" },
      INFORMATIONS_CONSEIL: { code: "INFORMATION_CONSEIL", category: "OTHER" },
      INDEMNISATION_PERTE_BAGAGES: {
        code: "BAGGAGE_LOSS_COMPENSATION",
        category: "OTHER",
      },
      INDEMNISATION_PERTE_PAPIERS: {
        code: "ID_LOSS_COMPENSATION",
        category: "OTHER",
      },
      INDEMNISATION_RETARD_BAGAGES: {
        code: "BAGGAGE_DELAY_COMPENSATION",
        category: "OTHER",
      },
      INDEMNISATION_VOL_PAPIERS: {
        code: "ID_THEFT_COMPENSATION",
        category: "OTHER",
      },
      RESERVATION_BILLET_CAS_ANNULATION: {
        code: "TICKET_RESERVATION",
        category: "OTHER",
      },
      ACHEMINEMENT_CONSULAT_AMBASSADE: {
        code: "CONSULATE_TRANSPORT",
        category: "OTHER",
      },
      FRAIS_ANNULATION_VOYAGE: {
        code: "TRIP_CANCELLATION_FEES",
        category: "OTHER",
      },
      HEBERGEMENT_ANNULATION_VOL: {
        code: "FLIGHT_CANCELLATION_ACCOMMODATION",
        category: "OTHER",
      },
    };

    const mapping = coverageMapping[coverage.coverage_code] || {
      code: coverage.coverage_code,
      category: "OTHER",
    };

    let configuredValue = option.configured_value;
    let possibleValues = option.possible_values || [];

    if (option.configured_value === "true") {
      configuredValue = "1";
      possibleValues = ["1"];
    } else if (option.configured_value === "false") {
      configuredValue = null;
      possibleValues = [];
    }

    return {
      coverage_id: coverage.coverage_id,
      coverage_code: mapping.code,
      category: mapping.category,
      inclusion_status: coverage.inclusion_status,
      unit: option.unit || null,
      configured_value: configuredValue,
      possible_values: possibleValues,
    };
  });

  res.json(
    new ApiResponse(200, data, "Product details retrieved successfully")
  );
});

export const getFamilyDetails = asyncHandler(async (req, res) => {
  const { familyId } = req.params;
  const family = familiesData.find((f) => f.id === parseInt(familyId, 10));
  if (!family)
    throw new ApiError(404, `Product family with ID ${familyId} not found`);
  res.json(
    new ApiResponse(200, family, "Family details retrieved successfully")
  );
});
