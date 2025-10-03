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
router.get("/countries", getCountriesController);
router.get("/countries/:country/cities", getCitiesByCountryController);

// Cars
router.get("/cars/brands", getCarBrandsController);
router.get("/cars/:brand/models", getCarModelsController);

export default router;
