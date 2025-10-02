import { Router } from "express";
import validateStepData from "../middlewares/validateStepData.js";
import {
  createSessionController,
  saveStepController,
  getAllSessionsController,
  getStepController,
  getSessionController,
  getSessionProgressController,
  patchSessionController,
  submitSessionController,
  deleteSessionController,
} from "../controllers/session.controller.js";

const router = Router();

router.post("/create", createSessionController);
router.get("/", getAllSessionsController);
router.post(
  "/:sessionId/step/:stepNumber",
  validateStepData,
  saveStepController
);
router.get("/:sessionId/step/:stepNumber", getStepController);
router.get("/:sessionId/progress", getSessionProgressController);
router.post("/:sessionId/submit", submitSessionController);
router.get("/:sessionId", getSessionController);
router.patch("/:sessionId", patchSessionController);
router.delete("/:sessionId", deleteSessionController);

export default router;
