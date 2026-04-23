// src/modules/assets/asset.routes.js
import { Router } from "express";
import {
  createAsset,
  getAssets,
  updateAsset,
  deleteAsset,
} from "./asset.controller.js";
import {
  createAssetValidator,
  getAssetsValidator,
  updateAssetValidator,
  deleteAssetValidator,
} from "./asset.validator.js";
import { protect, allowedTo } from "../auth/auth.middleware.js";
import { USER_ROLES } from "../../shared/constants/userRoles.enums.js";

const router = Router();

router.use(protect);

// POST /assets — Create asset (admin/operation only)
router.post(
  "/",
  allowedTo(USER_ROLES.ADMIN, USER_ROLES.OPERATION),
  createAssetValidator,
  createAsset,
);

// GET /assets — List assets (all roles)
router.get("/", getAssetsValidator, getAssets);

// PATCH /assets/:id — Update asset (admin/operation only)
router.patch(
  "/:id",
  allowedTo(USER_ROLES.ADMIN, USER_ROLES.OPERATION),
  updateAssetValidator,
  updateAsset,
);

// DELETE /assets/:id — Delete asset (admin/operation only)
router.delete(
  "/:id",
  allowedTo(USER_ROLES.ADMIN, USER_ROLES.OPERATION),
  deleteAssetValidator,
  deleteAsset,
);

export default router;
