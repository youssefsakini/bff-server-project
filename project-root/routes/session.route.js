import { Router } from "express";
import validateStepData from "../middlewares/validateStepData.js";
import {
  createSessionController,
  saveStepController,
  getSessionController,
  getStepController,
  submitSessionController,
  getAllSessionsController,
  deleteSessionController,
  patchSessionController,
  getSessionProgressController,
} from "../controllers/session.controller.js";

const router = Router();

router.post("/create", createSessionController);
router.post(
  "/:sessionId/step/:stepNumber",
  validateStepData,
  saveStepController
);
router.get("/:sessionId", getSessionController);
router.get("/:sessionId/step/:stepNumber", getStepController);
router.get("/:sessionId/progress", getSessionProgressController); // New endpoint
router.patch("/:sessionId", patchSessionController); // New endpoint
router.post("/:sessionId/submit", submitSessionController);
router.get("/", getAllSessionsController);
router.delete("/:sessionId", deleteSessionController);

export default router;
