import fetch from "node-fetch";
import * as sessionService from "../services/formSession.service.js";
import { mapFormData } from "../services/formMapper.service.js";
import { FINAL_SERVER_URL } from "../config/config.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const createSessionController = asyncHandler(async (req, res) => {
  const sessionId = await sessionService.createSession();
  res.json(new ApiResponse(201, { sessionId }, "Session created successfully"));
});

export const saveStepController = asyncHandler(async (req, res) => {
  const { sessionId, stepNumber } = req.params;
  const stepData = req.body;

  const session = await sessionService.getSession(sessionId);
  if (!session) throw new ApiError(404, "Session not found");

  const updatedSession = await sessionService.updateSessionStep(
    sessionId,
    stepNumber,
    stepData
  );

  res.json(
    new ApiResponse(
      200,
      {
        id: session.id,
        completedSteps: Object.keys(updatedSession.steps || {}),
        lastUpdated: updatedSession.last_updated,
      },
      `Step ${stepNumber} saved successfully`
    )
  );
});

export const getSessionController = asyncHandler(async (req, res) => {
  const session = await sessionService.getSession(req.params.sessionId);
  if (!session) throw new ApiError(404, "Session not found");
  res.json(new ApiResponse(200, session, "Session retrieved successfully"));
});

export const getStepController = asyncHandler(async (req, res) => {
  const { sessionId, stepNumber } = req.params;
  const stepData = await sessionService.getStepData(sessionId, stepNumber);
  if (!stepData) throw new ApiError(404, "Step data not found");
  res.json(new ApiResponse(200, stepData, "Step data retrieved successfully"));
});

export const submitSessionController = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const session = await sessionService.getSession(sessionId);
  if (!session) throw new ApiError(404, "Session not found");

  const requiredSteps = [1, 2, 3, 4];
  const completedSteps = Object.keys(session.steps || {}).map(Number);
  const missingSteps = requiredSteps.filter((s) => !completedSteps.includes(s));
  if (missingSteps.length > 0) {
    throw new ApiError(400, `Missing steps: ${missingSteps.join(", ")}`);
  }

  const mappedFormData = await mapFormData(session);

  try {
    const response = await fetch(`${FINAL_SERVER_URL}/api/submit-form`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mappedFormData),
    });

    if (!response.ok)
      throw new Error(`Final server responded with ${response.status}`);

    const externalResponse = await response.json();

    await sessionService.archiveSession(
      sessionId,
      mappedFormData,
      externalResponse,
      true
    );
    await sessionService.markSessionAsSubmitted(sessionId);

    res.json(
      new ApiResponse(
        200,
        {
          submissionId: externalResponse.submissionId,
          submittedData: mappedFormData,
          finalServerResponse: externalResponse,
        },
        "Form submitted successfully"
      )
    );
  } catch (err) {
    await sessionService.archiveSession(
      sessionId,
      mappedFormData,
      { error: err.message },
      false
    );
    throw new ApiError(500, `Failed to submit form: ${err.message}`, {
      retryable: true,
    });
  }
});

export const getAllSessionsController = asyncHandler(async (req, res) => {
  const sessions = await sessionService.getAllSessions();
  const formatted = sessions.map((s) => ({
    id: s.id,
    completedSteps: Object.keys(s.steps || {}).length,
    createdAt: s.created_at,
    lastUpdated: s.last_updated,
  }));
  res.json(
    new ApiResponse(
      200,
      { total: formatted.length, sessions: formatted },
      "Sessions retrieved"
    )
  );
});

export const deleteSessionController = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const success = await sessionService.deleteSession(sessionId);
  if (!success) throw new ApiError(404, "Session not found");
  res.json(new ApiResponse(200, {}, "Session deleted successfully"));
});

export const patchSessionController = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { stepNumber, stepData } = req.body;

  const session = await sessionService.getSession(sessionId);
  if (!session) throw new ApiError(404, "Session not found");

  const step = parseInt(stepNumber, 10);
  if (isNaN(step) || step < 1 || step > 4) {
    throw new ApiError(400, "Invalid step number. Must be between 1 and 4.");
  }

  const updatedSession = await sessionService.updateSessionStep(
    sessionId,
    step,
    stepData
  );

  res.json(
    new ApiResponse(
      200,
      {
        id: session.id,
        completedSteps: Object.keys(updatedSession.steps || {}),
        lastUpdated: updatedSession.last_updated,
      },
      `Step ${step} updated successfully`
    )
  );
});

export const getSessionProgressController = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const session = await sessionService.getSession(sessionId);
  if (!session) throw new ApiError(404, "Session not found");

  const completedSteps = Object.keys(session.steps || {}).map(Number);
  const lastCompletedStep =
    completedSteps.length > 0 ? Math.max(...completedSteps) : 0;
  const nextStep = lastCompletedStep < 4 ? lastCompletedStep + 1 : null;

  res.json(
    new ApiResponse(
      200,
      {
        sessionId: session.id,
        completedSteps,
        lastCompletedStep,
        nextStep,
        isComplete: completedSteps.length === 4,
        createdAt: session.created_at,
        lastUpdated: session.last_updated,
        status: session.status || "in_progress",
      },
      "Session progress retrieved successfully"
    )
  );
});
