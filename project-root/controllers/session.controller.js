import fetch from "node-fetch";
import {
  createSession,
  getSession,
  updateSessionStep,
  deleteSession,
  getAllSessions,
  archiveSession,
  getStepData,
  markSessionAsSubmitted,
} from "../services/formSession.service.js";
import { mapFormData } from "../services/formMapper.service.js";
import { FINAL_SERVER_URL } from "../config/config.js";

// Configuration and constants
const REQUIRED_STEPS = [1, 2, 3, 4];
const PRODUCT_API_BASE_URL = "http://localhost:5004/api/v1";

// Configuration objects for product data
const CONTRACT_TYPES_CONFIG = {
  1: [
    {
      id: 1,
      code: "INDIVIDUAL_FAMILY",
      imageUrl: "person-placeholder.svg",
    },
    {
      id: 2,
      code: "GROUP",
      imageUrl: "group-placeholder.svg",
    },
  ],
  2: [
    {
      id: 1,
      code: "MONO",
      imageUrl: "mono-placeholder.svg",
    },
    {
      id: 2,
      code: "FLEET",
      imageUrl: "fleet-placeholder.svg",
    },
  ],
};

const REASONS_CONFIG = {
  1: [
    {
      id: 1,
      code: "TOURISM",
      imageUrl: "tourism-placeholder.svg",
    },
    {
      id: 2,
      code: "STUDY",
      imageUrl: "studies-placeholder.svg",
    },
    {
      id: 3,
      code: "BUSINESS",
      imageUrl: "business-placeholder.svg",
    },
  ],
  2: [],
};

// Helper functions
const handleError = (res, error, context, statusCode = 500) => {
  console.error(`Error in ${context}:`, error);
  const message = statusCode === 500 ? `Failed to ${context}` : error.message;
  res.status(statusCode).json({ error: message });
};

const validateSessionExists = async (sessionId) => {
  const session = await getSession(sessionId);
  if (!session) {
    throw new Error("Session not found");
  }
  return session;
};

const validateStepNumber = (stepNumber) => {
  const step = parseInt(stepNumber);
  if (isNaN(step) || step < 1 || step > 4) {
    throw new Error("Invalid step number. Must be between 1 and 4.");
  }
  return step;
};

const validateRequiredSteps = (session) => {
  const completedSteps = Object.keys(session.steps || {}).map(Number);
  const missingSteps = REQUIRED_STEPS.filter(
    (step) => !completedSteps.includes(step)
  );

  if (missingSteps.length > 0) {
    throw new Error(
      `Incomplete form submission. Missing steps: ${missingSteps.join(", ")}`
    );
  }
};

const buildSessionResponse = (session, completedSteps) => ({
  id: session.id,
  completedSteps,
  lastUpdated: session.last_updated,
});

const buildProgressResponse = (session) => {
  const completedSteps = Object.keys(session.steps || {}).map(Number);
  const lastCompletedStep =
    completedSteps.length > 0 ? Math.max(...completedSteps) : 0;
  const nextStep = lastCompletedStep < 4 ? lastCompletedStep + 1 : null;

  return {
    sessionId: session.id,
    completedSteps,
    lastCompletedStep,
    nextStep,
    isComplete: completedSteps.length === 4,
    createdAt: session.created_at,
    lastUpdated: session.last_updated,
    status: session.status || "in_progress",
  };
};

// External API helpers
const fetchExternalApi = async (url, errorContext) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${errorContext}: ${response.statusText}`);
  }
  return response.json();
};

const submitToFinalServer = async (mappedFormData) => {
  const response = await fetch(`${FINAL_SERVER_URL}/api/submit-form`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(mappedFormData),
  });

  if (!response.ok) {
    throw new Error(`Final server responded with ${response.status}`);
  }

  return response.json();
};

// Product data helpers
const getContractTypesByFamily = (familyId) => {
  return CONTRACT_TYPES_CONFIG[familyId] || [];
};

const getReasonsByFamily = (familyId) => {
  return REASONS_CONFIG[familyId] || [];
};

const mapCoveragesToAdditionalOptions = (coverages) => {
  return (coverages || []).map((coverage, index) => ({
    id: coverage.coverage_id || index + 1,
    code: coverage.coverage_code || `COVERAGE_${index + 1}`,
    defaultValue: coverage.options?.[0]?.configured_value || null,
    possibleValues: coverage.options?.[0]?.possible_values || [],
  }));
};

const buildProductResponse = (productData, productId, familyId) => {
  const familyIdNum = parseInt(familyId);

  return {
    id: productData.product_info?.id || parseInt(productId),
    code: productData.product_info?.code || "UNKNOWN",
    imageUrl: `${
      productData.product_info?.code?.toLowerCase() || "default"
    }-placeholder.svg`,
    contractTypes: getContractTypesByFamily(familyIdNum),
    reasons: getReasonsByFamily(familyIdNum),
    additionalOptions: mapCoveragesToAdditionalOptions(productData.coverages),
  };
};

// Session Controllers
export const createSessionController = async (req, res) => {
  try {
    const sessionId = await createSession();
    res.json({ sessionId });
  } catch (error) {
    handleError(res, error, "create session");
  }
};

export const saveStepController = async (req, res) => {
  const { sessionId, stepNumber } = req.params;
  const stepData = req.body;

  try {
    const session = await validateSessionExists(sessionId);
    const updatedSession = await updateSessionStep(
      sessionId,
      stepNumber,
      stepData
    );

    res.json({
      success: true,
      message: `Step ${stepNumber} saved successfully`,
      session: buildSessionResponse(
        session,
        Object.keys(updatedSession.steps || {})
      ),
    });
  } catch (error) {
    if (error.message === "Session not found") {
      return res.status(404).json({ error: error.message });
    }
    handleError(res, error, "save step");
  }
};

export const getSessionController = async (req, res) => {
  try {
    const session = await validateSessionExists(req.params.sessionId);
    res.json(session);
  } catch (error) {
    if (error.message === "Session not found") {
      return res.status(404).json({ error: error.message });
    }
    handleError(res, error, "get session");
  }
};

export const getStepController = async (req, res) => {
  const { sessionId, stepNumber } = req.params;

  try {
    const stepData = await getStepData(sessionId, stepNumber);
    if (!stepData) {
      return res.status(404).json({
        error: "Step data not found",
        sessionId,
        stepNumber,
      });
    }

    res.json(stepData);
  } catch (error) {
    handleError(res, error, "get step data");
  }
};

export const submitSessionController = async (req, res) => {
  const { sessionId } = req.params;

  try {
    const session = await validateSessionExists(sessionId);
    validateRequiredSteps(session);

    const mappedFormData = await mapFormData(session);
    console.log("Submitting to final server:", mappedFormData);

    try {
      const externalResponse = await submitToFinalServer(mappedFormData);

      await archiveSession(sessionId, mappedFormData, externalResponse, true);
      await markSessionAsSubmitted(sessionId);

      res.json({
        success: true,
        message: "Form submitted successfully",
        submissionId: externalResponse.submissionId,
        submittedData: mappedFormData,
        finalServerResponse: externalResponse,
      });
    } catch (err) {
      console.error("Submission error:", err);
      await archiveSession(
        sessionId,
        mappedFormData,
        { error: err.message },
        false
      );

      res.status(500).json({
        error: "Failed to submit form",
        details: err.message,
        retryable: true,
        sessionId,
      });
    }
  } catch (error) {
    if (error.message === "Session not found") {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes("Incomplete form submission")) {
      return res.status(400).json({
        error: "Incomplete form submission",
        details: error.message.replace("Incomplete form submission. ", ""),
      });
    }
    handleError(res, error, "submit session");
  }
};

export const getAllSessionsController = async (req, res) => {
  try {
    const sessions = await getAllSessions();
    const formattedSessions = sessions.map((session) => ({
      id: session.id,
      completedSteps: Object.keys(session.steps || {}).length,
      createdAt: session.created_at,
      lastUpdated: session.last_updated,
    }));

    res.json({
      totalSessions: formattedSessions.length,
      sessions: formattedSessions,
    });
  } catch (error) {
    handleError(res, error, "get all sessions");
  }
};

export const deleteSessionController = async (req, res) => {
  const { sessionId } = req.params;

  try {
    const success = await deleteSession(sessionId);
    if (!success) return res.status(404).json({ error: "Session not found" });

    res.json({ success: true, message: "Session deleted successfully" });
  } catch (error) {
    handleError(res, error, "delete session");
  }
};

export const patchSessionController = async (req, res) => {
  const { sessionId } = req.params;
  const { stepNumber, stepData } = req.body;

  try {
    const session = await validateSessionExists(sessionId);
    const step = validateStepNumber(stepNumber);

    const updatedSession = await updateSessionStep(sessionId, step, stepData);

    res.json({
      success: true,
      message: `Step ${step} updated successfully`,
      session: buildSessionResponse(
        session,
        Object.keys(updatedSession.steps || {})
      ),
    });
  } catch (error) {
    if (error.message === "Session not found") {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes("Invalid step number")) {
      return res.status(400).json({ error: error.message });
    }
    handleError(res, error, "update session");
  }
};

export const getSessionProgressController = async (req, res) => {
  const { sessionId } = req.params;

  try {
    const session = await validateSessionExists(sessionId);
    const progress = buildProgressResponse(session);
    res.json(progress);
  } catch (error) {
    if (error.message === "Session not found") {
      return res.status(404).json({ error: error.message });
    }
    handleError(res, error, "get session progress");
  }
};

// Product Controllers
export const getProductFamiliesController = async (req, res) => {
  try {
    const { code } = req.query;
    const data = await fetchExternalApi(
      `${PRODUCT_API_BASE_URL}/product-families`,
      "External API error"
    );

    let items = data.items || [];
    if (code) {
      items = items.filter(
        (item) => item.code.toLowerCase() === code.toLowerCase()
      );
    }

    res.json({ items });
  } catch (error) {
    handleError(res, error, "fetch product families");
  }
};

export const getProductsByFamilyIdController = async (req, res) => {
  try {
    const { family_id } = req.query;

    if (!family_id) {
      return res
        .status(400)
        .json({ error: "Missing family_id query parameter" });
    }

    const data = await fetchExternalApi(
      `${PRODUCT_API_BASE_URL}/products?family_id=${family_id}`,
      "Backend API error"
    );

    res.json({ items: data.items || [] });
  } catch (error) {
    handleError(res, error, "fetch products by family");
  }
};

export const getProductsByProductId = async (req, res) => {
  try {
    const { productId } = req.params;
    const { family_id } = req.query;

    if (!productId) {
      return res
        .status(400)
        .json({ error: "Missing productId path parameter" });
    }

    const data = await fetchExternalApi(
      `${PRODUCT_API_BASE_URL}/products/${productId}`,
      "Backend API error"
    );

    const mappedProduct = buildProductResponse(data, productId, family_id);
    console.log("Mapped product data:", mappedProduct);
    res.json(mappedProduct);
  } catch (error) {
    handleError(res, error, "fetch product by ID");
  }
};

// Utility Controllers
export const aggregateDataController = async (req, res) => {
  try {
    const [posts, users] = await Promise.all([
      fetchExternalApi(
        "https://jsonplaceholder.typicode.com/posts",
        "Posts API error"
      ),
      fetchExternalApi(
        "https://jsonplaceholder.typicode.com/users",
        "Users API error"
      ),
    ]);

    res.json({ posts, users });
  } catch (error) {
    handleError(res, error, "aggregate data");
  }
};
