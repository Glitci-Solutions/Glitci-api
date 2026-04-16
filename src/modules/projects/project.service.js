import { ProjectModel } from "./project.model.js";
import { ProjectMemberModel } from "./projectMember.model.js";
import { ClientModel } from "../clients/client.model.js";
import { DepartmentModel } from "../departments/department.model.js";
import { ServiceModel } from "../services/service.model.js";
import { EmployeeModel } from "../employees/employee.model.js";
import { ApiError } from "../../shared/utils/ApiError.js";
import { normalizeEnum } from "../../shared/utils/apiFeatures.js";
import { convertToAllCurrencies } from "../../shared/utils/currencyService.js";
import { DEFAULT_CURRENCY } from "../../shared/constants/currency.enums.js";
import {
  PROJECT_STATUS,
  PROJECT_PRIORITY,
} from "../../shared/constants/project.enums.js";

// ================== PROJECT CRUD ==================

export async function createProjectService(payload, userId) {
  const { client, department, services = [], employees = [] } = payload;

  // Collect all employee IDs to validate
  const employeeIds = employees.map((e) => e.employee);

  // Parallel validation
  const validations = [
    ClientModel.findById(client),
    DepartmentModel.findById(department),
  ];

  if (services.length > 0) {
    validations.push(ServiceModel.countDocuments({ _id: { $in: services } }));
  }

  if (employeeIds.length > 0) {
    validations.push(
      EmployeeModel.find({ _id: { $in: employeeIds } }).populate("user"),
    );
  }

  const results = await Promise.all(validations);

  const clientExists = results[0];
  const departmentExists = results[1];
  let resultIdx = 2;

  if (!clientExists || !clientExists.isActive) {
    throw new ApiError("Client not found or inactive", 400);
  }

  if (!departmentExists || !departmentExists.isActive) {
    throw new ApiError("Department not found or inactive", 400);
  }

  if (services.length > 0) {
    const serviceCount = results[resultIdx];
    if (serviceCount !== services.length) {
      throw new ApiError("One or more services not found", 400);
    }
    resultIdx++;
  }

  if (employeeIds.length > 0) {
    const foundEmployees = results[resultIdx];
    if (foundEmployees.length !== employeeIds.length) {
      throw new ApiError("One or more employees not found", 400);
    }
    // Check all are active
    const inactiveEmployee = foundEmployees.find((e) => !e.user?.isActive);
    if (inactiveEmployee) {
      throw new ApiError("One or more employees are inactive", 400);
    }
  }

  // Create project (exclude employees from payload)
  const { employees: _, ...projectData } = payload;

  // Convert budget to all currencies
  const currency = projectData.currency || DEFAULT_CURRENCY;
  const budgetConverted = await convertToAllCurrencies(
    projectData.budget,
    currency,
  );

  const project = await ProjectModel.create({
    ...projectData,
    currency,
    budgetConverted,
    createdBy: userId,
  });

  // Batch create project members if any
  if (employees.length > 0) {
    // Convert all compensations in parallel
    const memberDocs = await Promise.all(
      employees.map(async (emp) => {
        const empCurrency = emp.currency || DEFAULT_CURRENCY;
        const compensationConverted = await convertToAllCurrencies(
          emp.compensation,
          empCurrency,
        );
        return {
          project: project._id,
          employee: emp.employee,
          compensation: emp.compensation,
          currency: empCurrency,
          compensationConverted,
        };
      }),
    );
    await ProjectMemberModel.insertMany(memberDocs);
  }

  return { message: "Project created successfully", id: project._id };
}

export async function getProjectsService(query) {
  const {
    page = 1,
    limit = 10,
    status,
    priority,
    client,
    department,
    employee,
    isActive = true,
    search,
  } = query;

  const filter = { isActive };

  // Normalize enums (case-insensitive)
  const normalizedStatus = normalizeEnum(status, PROJECT_STATUS);
  const normalizedPriority = normalizeEnum(priority, PROJECT_PRIORITY);

  if (normalizedStatus) filter.status = normalizedStatus;
  if (normalizedPriority) filter.priority = normalizedPriority;
  if (client) filter.client = client;
  if (department) filter.department = department;

  // Filter by employee — find projects where this employee is an active member
  if (employee) {
    const memberRecords = await ProjectMemberModel.find(
      { employee, removedAt: null },
      "project",
    ).lean();
    const projectIds = memberRecords.map((m) => m.project);
    filter._id = { $in: projectIds };
  }
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;

  // Run project query and count in parallel (lightweight - only UI-needed fields)
  const [projects, total] = await Promise.all([
    ProjectModel.find(filter)
      .select("name startDate endDate status priority client currency")
      .populate("client", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    ProjectModel.countDocuments(filter),
  ]);

  // Get employee counts using aggregation (fast!)
  const projectIds = projects.map((p) => p._id);
  const employeeCounts = await ProjectMemberModel.aggregate([
    { $match: { project: { $in: projectIds }, removedAt: null } },
    { $group: { _id: "$project", count: { $sum: 1 } } },
  ]);

  // Create count map
  const countMap = {};
  employeeCounts.forEach((ec) => {
    countMap[ec._id.toString()] = ec.count;
  });

  // Transform to UI-friendly format
  const data = projects.map((project) => ({
    id: project._id,
    name: project.name,
    client: project.client?.name || null,
    currency: project.currency,
    startDate: project.startDate,
    endDate: project.endDate,
    status: project.status,
    priority: project.priority,
    employeeCount: countMap[project._id.toString()] || 0,
  }));

  return {
    totalPages: Math.ceil(total / limit),
    page: Number(page),
    limit: Number(limit),
    results: total,
    data,
  };
}

export async function getProjectByIdService(id) {
  // Run both queries in parallel
  const [project, members] = await Promise.all([
    ProjectModel.findById(id)
      .select("-__v -budgetConverted")
      .populate("client", "name companyName email phones")
      .populate("department", "name")
      .populate("services", "name description")
      .populate("createdBy", "name email")
      .lean(),
    ProjectMemberModel.find({
      project: id,
      removedAt: null,
    })
      .populate({
        path: "employee",
        select: "employmentType user position",
        populate: [
          { path: "user", select: "name email phone" },
          { path: "position", select: "name" },
        ],
      })
      .lean(),
  ]);

  if (!project) {
    throw new ApiError("Project not found", 404);
  }

  // Transform to clean employees array
  const employees = members.map((member) => ({
    id: member.employee?._id,
    name: member.employee?.user?.name || null,
    email: member.employee?.user?.email || null,
    phone: member.employee?.user?.phone || null,
    position: member.employee?.position?.name || null,
    employmentType: member.employee?.employmentType || null,
    compensation: member.compensation,
    currency: member.currency,
    assignedAt: member.assignedAt,
  }));

  return { ...project, employees };
}

export async function updateProjectService(id, payload) {
  const project = await ProjectModel.findById(id);

  if (!project) {
    throw new ApiError("Project not found", 404);
  }

  const { client, department, services, employees, ...projectUpdates } =
    payload;

  // Collect employee IDs for validation (if employees array provided)
  const employeeIds = employees?.map((e) => e.employee) || [];

  // Parallel validation
  const validations = [];
  if (client) validations.push(ClientModel.findById(client));
  if (department) validations.push(DepartmentModel.findById(department));
  if (services?.length > 0)
    validations.push(ServiceModel.countDocuments({ _id: { $in: services } }));
  if (employeeIds.length > 0)
    validations.push(
      EmployeeModel.find({ _id: { $in: employeeIds } }).populate("user"),
    );

  const results = await Promise.all(validations);

  let idx = 0;
  if (client) {
    if (!results[idx] || !results[idx].isActive) {
      throw new ApiError("Client not found or inactive", 400);
    }
    idx++;
  }

  if (department) {
    if (!results[idx] || !results[idx].isActive) {
      throw new ApiError("Department not found or inactive", 400);
    }
    idx++;
  }

  if (services?.length > 0) {
    if (results[idx] !== services.length) {
      throw new ApiError("One or more services not found", 400);
    }
    idx++;
  }

  if (employeeIds.length > 0) {
    const foundEmployees = results[idx];
    if (foundEmployees.length !== employeeIds.length) {
      throw new ApiError("One or more employees not found", 400);
    }
    const inactiveEmployee = foundEmployees.find((e) => !e.user?.isActive);
    if (inactiveEmployee) {
      throw new ApiError("One or more employees are inactive", 400);
    }
  }

  // Update project fields (exclude employees)
  const updateData = { ...projectUpdates };
  if (client) updateData.client = client;
  if (department) updateData.department = department;
  if (services) updateData.services = services;

  // Re-convert budget if budget or currency changed
  if (updateData.budget !== undefined || updateData.currency !== undefined) {
    const newCurrency =
      updateData.currency || project.currency || DEFAULT_CURRENCY;
    const newBudget =
      updateData.budget !== undefined ? updateData.budget : project.budget;
    updateData.currency = newCurrency;
    updateData.budgetConverted = await convertToAllCurrencies(
      newBudget,
      newCurrency,
    );
  }

  if (Object.keys(updateData).length > 0) {
    await ProjectModel.findByIdAndUpdate(id, updateData, {
      runValidators: true,
    });
  }

  // Sync employees if employees array is provided
  if (employees !== undefined) {
    // Get ALL members (including removed) to handle re-activation
    const allMembers = await ProjectMemberModel.find({ project: id }).lean();

    const activeMemberMap = new Map();
    const removedMemberMap = new Map();

    for (const m of allMembers) {
      const empId = m.employee.toString();
      if (m.removedAt) {
        removedMemberMap.set(empId, m);
      } else {
        activeMemberMap.set(empId, m);
      }
    }

    const incomingEmployeeIds = new Set(employeeIds.map((e) => e.toString()));

    const toAdd = [];
    const toUpdate = [];
    const toReactivate = [];
    const toRemove = [];

    // Find employees to add, update, or reactivate
    for (const emp of employees) {
      const empId = emp.employee.toString();
      const existingActive = activeMemberMap.get(empId);
      const existingRemoved = removedMemberMap.get(empId);
      const empCurrency = emp.currency || DEFAULT_CURRENCY;

      if (existingActive) {
        // Existing active employee - check if needs update
        if (
          existingActive.compensation !== emp.compensation ||
          existingActive.currency !== empCurrency
        ) {
          toUpdate.push({
            memberId: existingActive._id,
            compensation: emp.compensation,
            currency: empCurrency,
          });
        }
      } else if (existingRemoved) {
        // Previously removed employee - reactivate with new compensation
        toReactivate.push({
          memberId: existingRemoved._id,
          compensation: emp.compensation,
          currency: empCurrency,
        });
      } else {
        // Completely new employee - add
        toAdd.push({
          project: id,
          employee: emp.employee,
          compensation: emp.compensation,
          currency: empCurrency,
        });
      }
    }

    // Find employees to remove (active in DB but not in incoming)
    for (const [empId, member] of activeMemberMap) {
      if (!incomingEmployeeIds.has(empId)) {
        toRemove.push(member._id);
      }
    }

    // Execute operations in parallel
    const operations = [];

    // Add new members with currency conversion
    if (toAdd.length > 0) {
      const memberDocsWithConversion = await Promise.all(
        toAdd.map(async (member) => ({
          ...member,
          compensationConverted: await convertToAllCurrencies(
            member.compensation,
            member.currency,
          ),
        })),
      );
      operations.push(ProjectMemberModel.insertMany(memberDocsWithConversion));
    }

    // Update compensation for existing members
    for (const update of toUpdate) {
      const compensationConverted = await convertToAllCurrencies(
        update.compensation,
        update.currency,
      );
      operations.push(
        ProjectMemberModel.findByIdAndUpdate(update.memberId, {
          compensation: update.compensation,
          currency: update.currency,
          compensationConverted,
        }),
      );
    }

    // Reactivate previously removed members
    for (const reactivate of toReactivate) {
      const compensationConverted = await convertToAllCurrencies(
        reactivate.compensation,
        reactivate.currency,
      );
      operations.push(
        ProjectMemberModel.findByIdAndUpdate(reactivate.memberId, {
          compensation: reactivate.compensation,
          currency: reactivate.currency,
          compensationConverted,
          removedAt: null,
          assignedAt: new Date(),
        }),
      );
    }

    // Soft-delete removed members
    if (toRemove.length > 0) {
      operations.push(
        ProjectMemberModel.updateMany(
          { _id: { $in: toRemove } },
          { removedAt: new Date() },
        ),
      );
    }

    if (operations.length > 0) {
      await Promise.all(operations);
    }
  }

  return { message: "Project updated successfully" };
}

export async function deleteProjectService(id) {
  const project = await ProjectModel.findById(id);

  if (!project) {
    throw new ApiError("Project not found", 404);
  }

  await ProjectModel.findByIdAndUpdate(id, { isActive: false });

  return { message: "Project deleted successfully" };
}

export async function toggleProjectActiveService(id) {
  const project = await ProjectModel.findById(id);

  if (!project) {
    throw new ApiError("Project not found", 404);
  }

  project.isActive = !project.isActive;
  await project.save();

  return {
    message: `Project ${project.isActive ? "activated" : "deactivated"} successfully`,
    isActive: project.isActive,
  };
}
