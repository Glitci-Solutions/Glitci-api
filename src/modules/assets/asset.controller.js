// src/modules/assets/asset.controller.js
import asyncHandler from "express-async-handler";
import {
  createAssetService,
  getAssetsService,
  updateAssetService,
  deleteAssetService,
} from "./asset.service.js";

// POST /assets — Create asset (admin/operation only)
export const createAsset = asyncHandler(async (req, res) => {
  const asset = await createAssetService(req.body, req.user._id);
  res.status(201).json({ message: "Asset created successfully", data: asset });
});

// GET /assets — List assets (all roles)
export const getAssets = asyncHandler(async (req, res) => {
  const result = await getAssetsService(req.query);
  res.status(200).json(result);
});

// PATCH /assets/:id — Update asset (admin/operation only)
export const updateAsset = asyncHandler(async (req, res) => {
  const asset = await updateAssetService(req.params.id, req.body);
  res.status(200).json({ message: "Asset updated successfully", data: asset });
});

// DELETE /assets/:id — Delete asset (admin/operation only)
export const deleteAsset = asyncHandler(async (req, res) => {
  await deleteAssetService(req.params.id);
  res.status(200).json({ message: "Asset deleted successfully" });
});
