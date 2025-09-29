// routes/session.route.js
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
  getProductFamiliesController,
  getProductsByFamilyIdController,
  getProductsByProductId,
} from "../controllers/session.controller.js";

const router = Router();

// Static / specific routes first
router.post("/create", createSessionController);
router.get("/product-families", getProductFamiliesController);
router.get("/products", getProductsByFamilyIdController);
router.get("/", getAllSessionsController);

// Step-specific routes (still specific)
router.post(
  "/:sessionId/step/:stepNumber",
  validateStepData,
  saveStepController
);
router.get("/:sessionId/step/:stepNumber", getStepController);
router.get("/:sessionId/progress", getSessionProgressController);
router.post("/:sessionId/submit", submitSessionController);

// Param routes last
router.get("/products/:productId", getProductsByProductId);
router.get("/:sessionId", getSessionController);
router.patch("/:sessionId", patchSessionController);
router.delete("/:sessionId", deleteSessionController);

export default router;
