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

    // Filter by code if query param is provided
    let items = data.items || [];
    if (code) {
      items = items.filter(
        (item) => item.code.toLowerCase() === code.toLowerCase()
      );
    }

    res.json({ items });
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

    res.json({
      items: data.items || [],
    });
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

    res.json(data);
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    res.status(500).json({ error: "Failed to fetch product" });
  }
};
