// src/modules/departments/department.service.js
import { DepartmentModel } from "./department.model.js";
import { ApiError } from "../../shared/utils/ApiError.js";
import {
  buildPagination,
  buildRegexFilter,
} from "../../shared/utils/apiFeatures.js";

// Helper to build department response
export function buildDepartmentResponse(dept) {
  return {
    id: dept._id,
    name: dept.name,
    isActive: dept.isActive,
    createdAt: dept.createdAt,
    updatedAt: dept.updatedAt,
  };
}

// Get all departments with filters
export async function getDepartmentsService(queryParams) {
  const { page, limit, isActive, ...query } = queryParams;

  const filter = buildRegexFilter(query, ["page", "limit", "isActive"]);

  if (isActive !== undefined) {
    filter.isActive = isActive === "true" || isActive === true;
  } else {
    filter.isActive = true;
  }

  const totalCount = await DepartmentModel.countDocuments(filter);

  const { pageNum, limitNum, skip } = buildPagination({ page, limit }, 10);

  const departments = await DepartmentModel.find(filter)
    .skip(skip)
    .limit(limitNum)
    .sort("name");

  const totalPages = Math.ceil(totalCount / limitNum) || 1;

  return {
    totalPages,
    page: pageNum,
    limit: limitNum,
    results: departments.length,
    data: departments.map(buildDepartmentResponse),
  };
}

// Get single department by ID
export async function getDepartmentByIdService(id) {
  const dept = await DepartmentModel.findById(id);

  if (!dept) {
    throw new ApiError("Department not found", 404);
  }

  return buildDepartmentResponse(dept);
}

// Create department
export async function createDepartmentService(payload) {
  const { name } = payload;

  const existing = await DepartmentModel.findOne({ name: name.toLowerCase() });
  if (existing) {
    throw new ApiError("Department already exists with this name", 409);
  }

  const dept = await DepartmentModel.create({
    name: name,
    isActive: true,
  });

  return buildDepartmentResponse(dept);
}

// Update department (name only, isActive via toggle)
export async function updateDepartmentService(id, payload) {
  const dept = await DepartmentModel.findById(id);

  if (!dept) {
    throw new ApiError("Department not found", 404);
  }

  const { name } = payload;

  if (name !== undefined) {
    // Check for duplicate name
    const existing = await DepartmentModel.findOne({
      name: name,
      _id: { $ne: id },
    });
    if (existing) {
      throw new ApiError("Department already exists with this name", 409);
    }
    dept.name = name.toLowerCase();
  }

  const updatedDept = await dept.save();
  return buildDepartmentResponse(updatedDept);
}

// Toggle department active status
export async function toggleDepartmentActiveService(id) {
  const dept = await DepartmentModel.findById(id);

  if (!dept) {
    throw new ApiError("Department not found", 404);
  }

  dept.isActive = !dept.isActive;
  const updatedDept = await dept.save();

  return buildDepartmentResponse(updatedDept);
}

// Delete department (permanent)
export async function deleteDepartmentService(id) {
  const dept = await DepartmentModel.findById(id);

  if (!dept) {
    throw new ApiError("Department not found", 404);
  }

  await dept.deleteOne();

  return { id, message: "Department deleted successfully" };
}
