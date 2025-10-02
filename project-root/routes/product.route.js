import { Router } from "express";
import {
  getProductFamiliesController,
  getProductsByFamilyIdController,
  getProductsByProductId,
  getFamilyDetails,
} from "../controllers/product.controller.js";

const router = Router();

router.get("/product-families", getProductFamiliesController);
router.get("/product", getProductsByFamilyIdController);
router.get("/product-families/:familyId", getFamilyDetails);
router.get("/:productId", getProductsByProductId);

export default router;
