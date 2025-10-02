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
import { familiesData } from "../helper/data.js";

export const createSessionController = async (req, res) => {
  try {
    const sessionId = await createSession();
    res.json({ sessionId });
  } catch (error) {
    console.error("Error creating session:", error);
    res.status(500).json({ error: "Failed to create session" });
  }
};

export const saveStepController = async (req, res) => {
  const { sessionId, stepNumber } = req.params;
  const stepData = req.body;

  try {
    const session = await getSession(sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const updatedSession = await updateSessionStep(
      sessionId,
      stepNumber,
      stepData
    );

    res.json({
      success: true,
      message: `Step ${stepNumber} saved successfully`,
      session: {
        id: session.id,
        completedSteps: Object.keys(updatedSession.steps || {}),
        lastUpdated: updatedSession.last_updated,
      },
    });
  } catch (error) {
    console.error("Error saving step:", error);
    res.status(500).json({ error: "Failed to save step" });
  }
};

export const getSessionController = async (req, res) => {
  try {
    const session = await getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });
    res.json(session);
  } catch (error) {
    console.error("Error getting session:", error);
    res.status(500).json({ error: "Failed to get session" });
  }
};

// New endpoint to get specific step data
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
    console.error("Error getting step:", error);
    res.status(500).json({ error: "Failed to get step data" });
  }
};

export const submitSessionController = async (req, res) => {
  const { sessionId } = req.params;

  try {
    const session = await getSession(sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });

    // Check if all required steps are completed
    const requiredSteps = [1, 2, 3, 4];
    const completedSteps = Object.keys(session.steps || {}).map(Number);
    const missingSteps = requiredSteps.filter(
      (step) => !completedSteps.includes(step)
    );

    if (missingSteps.length > 0) {
      return res.status(400).json({
        error: "Incomplete form submission",
        details: `Missing steps: ${missingSteps.join(", ")}`,
      });
    }

    // Map the data from individual steps
    const mappedFormData = await mapFormData(session);
    console.log("Submitting to final server:", mappedFormData);

    try {
      const response = await fetch(`${FINAL_SERVER_URL}/api/submit-form`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mappedFormData),
      });

      if (!response.ok) {
        throw new Error(`Final server responded with ${response.status}`);
      }

      const externalResponse = await response.json();

      // Archive the submission (not the session data)
      await archiveSession(sessionId, mappedFormData, externalResponse, true);

      // Mark session as submitted but don't delete it
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

      // Archive the failed submission
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
    console.error("Error in submit session:", error);
    res.status(500).json({ error: "Internal server error" });
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
    console.error("Error getting all sessions:", error);
    res.status(500).json({ error: "Failed to get sessions" });
  }
};

export const deleteSessionController = async (req, res) => {
  const { sessionId } = req.params;

  try {
    const success = await deleteSession(sessionId);
    if (!success) return res.status(404).json({ error: "Session not found" });

    res.json({ success: true, message: "Session deleted successfully" });
  } catch (error) {
    console.error("Error deleting session:", error);
    res.status(500).json({ error: "Failed to delete session" });
  }
};

// Add this new controller function
export const patchSessionController = async (req, res) => {
  const { sessionId } = req.params;
  const { stepNumber, stepData } = req.body;

  try {
    // Check if session exists
    const session = await getSession(sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });

    // Validate step number
    const step = parseInt(stepNumber);
    if (isNaN(step) || step < 1 || step > 4) {
      return res.status(400).json({
        error: "Invalid step number. Must be between 1 and 4.",
      });
    }

    // Update the specific step
    const updatedSession = await updateSessionStep(sessionId, step, stepData);

    res.json({
      success: true,
      message: `Step ${step} updated successfully`,
      session: {
        id: session.id,
        completedSteps: Object.keys(updatedSession.steps || {}),
        lastUpdated: updatedSession.last_updated,
      },
    });
  } catch (error) {
    console.error("Error patching session:", error);
    res.status(500).json({ error: "Failed to update session" });
  }
};

// Add this function to get session progress
export const getSessionProgressController = async (req, res) => {
  const { sessionId } = req.params;

  try {
    const session = await getSession(sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });

    // Determine the last completed step and next step
    const completedSteps = Object.keys(session.steps || {}).map(Number);
    const lastCompletedStep =
      completedSteps.length > 0 ? Math.max(...completedSteps) : 0;

    const nextStep = lastCompletedStep < 4 ? lastCompletedStep + 1 : null;

    res.json({
      sessionId: session.id,
      completedSteps: completedSteps,
      lastCompletedStep: lastCompletedStep,
      nextStep: nextStep,
      isComplete: completedSteps.length === 4,
      createdAt: session.created_at,
      lastUpdated: session.last_updated,
      status: session.status || "in_progress",
    });
  } catch (error) {
    console.error("Error getting session progress:", error);
    res.status(500).json({ error: "Failed to get session progress" });
  }
};

export const getProductFamiliesController = async (req, res) => {
  try {
    const { code } = req.query;

    const response = await fetch(
      "http://localhost:5004/api/v1/product-families"
    );

    if (!response.ok) {
      throw new Error(`External API error: ${response.statusText}`);
    }

    const data = await response.json();

    let items = data.items || [];
    if (code) {
      items = items.filter(
        (item) => item.code.toLowerCase() === code.toLowerCase()
      );
    }

    const transformedItems = items.map((item) => {
      const { name, ...rest } = item;

      const imageMap = {
        VOYAGE: "person-placeholder.svg",
        AUTO: "auto-placeholder.svg",
        SANTE: "sante-placeholder.svg",
      };

      return {
        ...rest,
        imgUrl: imageMap[item.code],
      };
    });

    res.json(transformedItems);
  } catch (error) {
    console.error("Error fetching product families:", error);
    res.status(500).json({ error: "Failed to fetch product families" });
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

    const response = await fetch(
      `http://localhost:5004/api/v1/products?family_id=${family_id}`
    );

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Transform the items to match the desired format
    const transformedItems = (data.items || []).map((item) => {
      // Remove name and is_base_product fields, add imageUrl and price
      const { name, is_base_product, ...rest } = item;

      // Map product codes to prices (you can customize this as needed)
      const priceMap = {
        ISAAF_MONDE: 830,
        ISAAF_VISA_EUROPE: 1200,
        ISAAF_ETUDIANTS_EXPATRIES: 4800,
        // Add more product codes and prices as needed
      };

      return {
        ...rest,
        imageUrl: "globe-placeholder.svg", // All products get the same image for now
        price: priceMap[item.code] || 0, // Default to 0 if price not mapped
      };
    });

    // Return the transformed array directly without items wrapper
    res.json(transformedItems);
  } catch (error) {
    console.error("Error fetching products by family:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
};

export const getProductsByProductId = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res
        .status(400)
        .json({ error: "Missing productId path parameter" });
    }

    const response = await fetch(
      `http://localhost:5004/api/v1/products/${productId}`
    );

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Transform coverages to the desired format
    const transformedCoverages = (data.coverages || []).map((coverage) => {
      // Get the first option (assuming there's always at least one)
      const option = coverage.options?.[0] || {};

      // Map coverage codes to new format and determine category
      const coverageMapping = {
        // Medical coverages
        CONSEIL_MEDICAL: { code: "MEDICAL_ADVICE", category: "SANTE" },
        VISITE_MEDICALE: { code: "MEDICAL_VISIT", category: "SANTE" },
        TRANSPORT_ASSURE_ACCOMPAGNATEUR: {
          code: "MEDICAL_TRANSPORT",
          category: "SANTE",
        },
        TRANSPORT_CORPS_DECES: { code: "MEDICAL_TRANSPORT", category: "SANTE" },

        // Auto coverages
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

        // Health coverages
        AVANCE_ADMISSION_HOSPITALIERE: {
          code: "HOSPITAL_ADMISSION_ADVANCE",
          category: "SANTE",
        },
        FRAIS_DENTAIRES: { code: "DENTAL_EXPENSES", category: "SANTE" },
        FRAIS_MEDICAUX: { code: "MEDICAL_EXPENSES", category: "SANTE" },

        // Travel coverages
        FORFAITS_FUNERAIRES: { code: "FUNERAL_ALLOWANCE", category: "VOYAGE" },

        // Other coverages
        HONORAIRES_REPRESENTANT_JUDICIAIRE: {
          code: "LEGAL_REPRESENTATIVE_FEES",
          category: "OTHER",
        },
        HEBERGEMENT: { code: "ACCOMMODATION", category: "OTHER" },
        AVANCE_CAUTION_PENALE: { code: "CAUTION_ADVANCE", category: "OTHER" },
        INFORMATIONS_CONSEIL: {
          code: "INFORMATION_CONSEIL",
          category: "OTHER",
        },

        // Optional coverages
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

      // Handle boolean values (convert "true"/"false" strings to "1"/null)
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

    // Return the transformed coverages array directly
    res.json(transformedCoverages);
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    res.status(500).json({ error: "Failed to fetch product" });
  }
};

export const getFamilyDetails = async (req, res) => {
  try {
    const { familyId } = req.params;

    // Find the family by ID
    const family = familiesData.find((f) => f.id === parseInt(familyId));

    if (!family) {
      return res.status(404).json({
        error: "Family not found",
        message: `Product family with ID ${familyId} does not exist`,
      });
    }

    res.json(family);
  } catch (error) {
    console.error("Error fetching family details:", error);
    res.status(500).json({
      error: "Failed to fetch family details",
      message: error.message,
    });
  }
};
