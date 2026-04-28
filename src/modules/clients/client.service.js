// src/modules/clients/client.service.js
import { ClientModel } from "./client.model.js";
import { ApiError } from "../../shared/utils/ApiError.js";
import {
  buildPagination,
  buildSort,
  buildRegexFilter,
} from "../../shared/utils/apiFeatures.js";

// Helper to build client response
export function buildClientResponse(client) {
  return {
    id: client._id,
    name: client.name,
    companyName: client.companyName,
    email: client.email,
    phones: client.phones || [],
    industry: client.industry || null,
    notes: client.notes || null,
    isActive: client.isActive,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
  };
}

// Get all clients with filters
export async function getClientsService(queryParams) {
  const { page, limit, isActive, ...query } = queryParams;

  const filter = buildRegexFilter(query, ["page", "limit", "isActive"]);

  if (isActive !== undefined) {
    filter.isActive = isActive === "true" || isActive === true;
  } else {
    filter.isActive = true;
  }

  const totalCount = await ClientModel.countDocuments(filter);

  const { pageNum, limitNum, skip } = buildPagination({ page, limit }, 10);

  let clients = await ClientModel.find(filter)
    .skip(skip)
    .limit(limitNum)
    .sort("-createdAt");

  const totalPages = Math.ceil(totalCount / limitNum) || 1;

  return {
    totalPages,
    page: pageNum,
    limit: limitNum,
    results: clients.length,
    data: clients.map(buildClientResponse),
  };
}

// Get single client by ID
export async function getClientByIdService(id) {
  const client = await ClientModel.findById(id);

  if (!client) {
    throw new ApiError("Client not found", 404);
  }

  return buildClientResponse(client);
}

// Create client
export async function createClientService(payload) {
  const { name, companyName, email, phones, industry, notes } = payload;

  const client = await ClientModel.create({
    name,
    companyName,
    email: email ? email.toLowerCase() : undefined,
    phones: phones || [],
    industry: industry || null,
    notes: notes || null,
    isActive: true,
  });

  return buildClientResponse(client);
}

// Update client (all fields except isActive)
export async function updateClientService(id, payload) {
  const client = await ClientModel.findById(id);

  if (!client) {
    throw new ApiError("Client not found", 404);
  }

  const { name, companyName, email, phones, industry, notes } = payload;

  if (name !== undefined) client.name = name;
  if (companyName !== undefined) client.companyName = companyName;
  if (email !== undefined) client.email = email ? email.toLowerCase() : email;
  if (phones !== undefined) client.phones = phones;
  if (industry !== undefined) client.industry = industry;
  if (notes !== undefined) client.notes = notes;

  const updatedClient = await client.save();
  return buildClientResponse(updatedClient);
}

// Toggle client active status
export async function toggleClientActiveService(id) {
  const client = await ClientModel.findById(id);

  if (!client) {
    throw new ApiError("Client not found", 404);
  }

  client.isActive = !client.isActive;
  const updatedClient = await client.save();

  return buildClientResponse(updatedClient);
}

// Delete client (permanent)
export async function deleteClientService(id) {
  const client = await ClientModel.findById(id);

  if (!client) {
    throw new ApiError("Client not found", 404);
  }

  await client.deleteOne();

  return { id, message: "Client deleted successfully" };
}
