import { Router } from "express";
import {
  getStaticRepositoryController,
  getCountriesController,
  getCitiesByCountryController,
  getCarBrandsController,
  getCarModelsController,
} from "../controllers/repository.controller.js";

const router = Router();

// Static repository
router.get("/", getStaticRepositoryController);

// Countries & Cities
// router.get("/countries", getCountriesController);
router.get("/countries/:countryIso/cities", getCitiesByCountryController);

// Cars
// router.get("/car-brands", getCarBrandsController);
router.get("/car-brands/:brandId/models", getCarModelsController);

export default router;
