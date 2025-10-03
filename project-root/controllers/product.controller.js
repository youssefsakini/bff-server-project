import fetch from "node-fetch";
import { familiesData } from "../helper/data.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { BACKEND_SERVER_URL } from "../config/config.js";

export const getProductFamiliesController = asyncHandler(async (req, res) => {
  const { code } = req.query;
  const response = await fetch(`${BACKEND_SERVER_URL}/product-families`);
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
      `${BACKEND_SERVER_URL}/products?family_id=${family_id}`
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

  const response = await fetch(`${BACKEND_SERVER_URL}/products/${productId}`);
  if (!response.ok)
    throw new ApiError(500, `Backend API error: ${response.statusText}`);

  const data = await response.json();
  const transformedCoverages = (data.coverages || []).map((coverage) => {
    const option = coverage.options?.[0] || {};

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
      coverage_code: coverage.coverage_code,
      category: coverage.category_code || "OTHER",
      inclusion_status: coverage.inclusion_status,
      unit: option.unit || null,
      configured_value: configuredValue,
      possible_values: possibleValues,
    };
  });

  res.json(
    new ApiResponse(
      200,
      transformedCoverages,
      "Product details retrieved successfully"
    )
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
