// src/modules/assets/asset.service.js
import { AssetModel } from "./asset.model.js";
import { ClientModel } from "../clients/client.model.js";
import { ProjectModel } from "../projects/project.model.js";
import { ApiError } from "../../shared/utils/ApiError.js";
import { buildPagination } from "../../shared/utils/apiFeatures.js";

// ─── Populate options ──────────────────────────────────────

const populateOptions = [
  { path: "client", select: "name" },
  { path: "project", select: "name" },
  { path: "createdBy", select: "name" },
];

// ─── Response builder ──────────────────────────────────────

function buildAssetResponse(asset) {
  const client = asset.client || null;
  const project = asset.project || null;
  const createdBy = asset.createdBy || {};

  return {
    id: asset._id,
    name: asset.name,
    url: asset.url,
    description: asset.description,
    client: client
      ? {
          id: client._id || client,
          name: client.name || null,
        }
      : null,
    project: project
      ? {
          id: project._id || project,
          name: project.name || null,
        }
      : null,
    createdBy: {
      id: createdBy._id || createdBy,
      name: createdBy.name || null,
    },
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  };
}

// ─── Create Asset ──────────────────────────────────────────

export async function createAssetService(data, creatorUserId) {
  // Validate client exists if provided
  if (data.client) {
    const clientExists = await ClientModel.exists({ _id: data.client });
    if (!clientExists) {
      throw new ApiError("Client not found", 400);
    }
  }

  // Validate project exists if provided
  if (data.project) {
    const projectExists = await ProjectModel.exists({ _id: data.project });
    if (!projectExists) {
      throw new ApiError("Project not found", 400);
    }
  }

  const asset = await AssetModel.create({
    name: data.name,
    url: data.url,
    description: data.description || null,
    client: data.client || null,
    project: data.project || null,
    createdBy: creatorUserId,
  });

  const populated = await AssetModel.findById(asset._id).populate(
    populateOptions,
  );

  return buildAssetResponse(populated);
}

// ─── Get Assets (list, grouped by client) ──────────────────

export async function getAssetsService(queryParams) {
  const { client, project } = queryParams;

  const filter = {};

  if (client) {
    filter.client = client;
  }

  if (project) {
    filter.project = project;
  }

  const assets = await AssetModel.find(filter)
    .populate(populateOptions)
    .sort({ createdAt: -1 });

  // Group assets by client
  const groupsMap = new Map();

  for (const asset of assets) {
    const assetClient = asset.client || null;
    const key = assetClient ? assetClient._id.toString() : "general";

    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        clientId: assetClient ? assetClient._id : null,
        clientName: assetClient ? assetClient.name : "General",
        assets: [],
      });
    }

    groupsMap.get(key).assets.push(buildAssetResponse(asset));
  }

  // Put "General" at the end
  const groups = [];
  let generalGroup = null;

  for (const group of groupsMap.values()) {
    if (group.clientId === null) {
      generalGroup = group;
    } else {
      groups.push(group);
    }
  }

  if (generalGroup) {
    groups.push(generalGroup);
  }

  return {
    results: assets.length,
    data: groups,
  };
}

// ─── Update Asset ──────────────────────────────────────────

export async function updateAssetService(assetId, updateData) {
  const asset = await AssetModel.findById(assetId);

  if (!asset) {
    throw new ApiError("Asset not found", 404);
  }

  // Validate client exists if changed
  if (updateData.client && updateData.client !== asset.client?.toString()) {
    const clientExists = await ClientModel.exists({ _id: updateData.client });
    if (!clientExists) throw new ApiError("Client not found", 400);
  }

  // Validate project exists if changed
  if (updateData.project && updateData.project !== asset.project?.toString()) {
    const projectExists = await ProjectModel.exists({
      _id: updateData.project,
    });
    if (!projectExists) throw new ApiError("Project not found", 400);
  }

  Object.assign(asset, updateData);
  await asset.save();

  const updated = await AssetModel.findById(assetId).populate(populateOptions);
  return buildAssetResponse(updated);
}

// ─── Delete Asset ──────────────────────────────────────────

export async function deleteAssetService(assetId) {
  const asset = await AssetModel.findByIdAndDelete(assetId);
  if (!asset) {
    throw new ApiError("Asset not found", 404);
  }
  return true;
}
