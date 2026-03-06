import crypto from "crypto";
import { UserModel } from "./user.model.js";
import { EmployeeModel } from "../employees/employee.model.js";
import { SkillModel } from "../skills/skill.model.js";
import { ApiError } from "../../shared/utils/ApiError.js";
import { USER_ROLES } from "../../shared/constants/userRoles.enums.js";
import {
  buildPagination,
  buildSort,
  buildRegexFilter,
} from "../../shared/utils/apiFeatures.js";
import {
  validateImageFile,
  uploadImageToCloudinary,
  deleteImageFromCloudinary,
} from "../../shared/utils/imageUpload.js";
import sendEmail from "../../shared/Email/sendEmails.js";
import { accountCreatedEmailHTML } from "../../shared/Email/emailHtml.js";

const DEFAULT_USER_AVATAR_URL =
  "https://res.cloudinary.com/dx5n4ekk2/image/upload/v1767069108/petyard/users/user_default_avatar_2.svg";

// Helper to build user response (only return url for image)
export function buildUserResponse(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone || null,
    image: user?.image?.url || null,
    role: user.role,
    isActive: user.isActive,
    currency: user.currency,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// Helper to build employee profile for response
function buildEmployeeProfile(employee) {
  if (!employee) return null;
  return {
    id: employee._id,
    department: employee.department
      ? {
          id: employee.department._id || employee.department,
          name: employee.department.name || null,
        }
      : null,
    position: employee.position
      ? {
          id: employee.position._id || employee.position,
          name: employee.position.name || null,
        }
      : null,
    skills: employee.skills
      ? employee.skills.map((skill) => ({
          id: skill._id || skill,
          name: skill.name || null,
        }))
      : [],
  };
}

// ----- Admin Services -----

export async function getUsersService(queryParams) {
  const { page, limit, sort, ...query } = queryParams;

  // Build filter from query params (case-insensitive regex)
  const filter = buildRegexFilter(query, ["page", "limit", "sort"]);

  // Exclude admins and employees from the list (managed via separate endpoints)
  filter.role = { $nin: [USER_ROLES.ADMIN, USER_ROLES.EMPLOYEE] };

  const totalCount = await UserModel.countDocuments(filter);

  const { pageNum, limitNum, skip } = buildPagination({ page, limit }, 10);
  const sortObj = buildSort({ sort }, "-createdAt");

  let usersQuery = UserModel.find(filter).skip(skip).limit(limitNum);

  if (sortObj) {
    usersQuery = usersQuery.sort(sortObj);
  }

  const users = await usersQuery;

  const totalPages = Math.ceil(totalCount / limitNum) || 1;

  return {
    totalPages,
    page: pageNum,
    results: users.length,
    data: users.map(buildUserResponse),
  };
}

export async function getUserByIdService(id) {
  const user = await UserModel.findById(id);
  if (!user) {
    throw new ApiError(`No user found for this id: ${id}`, 404);
  }
  return buildUserResponse(user);
}

export async function createUserService(payload) {
  const { name, email, phone, role } = payload;

  if (!name || !email || !role) {
    throw new ApiError("Missing required fields from (name, email, role)", 400);
  }

  // Block ADMIN creation
  if (role === USER_ROLES.ADMIN) {
    throw new ApiError("Cannot create admin users through this endpoint", 400);
  }

  // Block EMPLOYEE creation - must use /employees route
  if (role === USER_ROLES.EMPLOYEE) {
    throw new ApiError(
      "Employees must be created via /employees endpoint",
      400,
    );
  }

  const existing = await UserModel.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new ApiError("User already exists with this email", 409);
  }

  // Generate 12-char temporary password
  const tempPassword = crypto.randomBytes(6).toString("hex");

  // Start transaction
  const mongoose = (await import("mongoose")).default;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const [user] = await UserModel.create(
      [
        {
          name,
          email: email.toLowerCase(),
          phone: phone || null,
          password: null,
          tempPassword,
          role: role,
          isActive: true,
        },
      ],
      { session },
    );

    const firstName = (user.name || "").split(" ")[0] || "there";
    const capitalizedName =
      firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();

    // Send welcome email with credentials (blocking - rollback if fails)
    await sendEmail({
      email: user.email,
      subject: "Welcome to Glitci - Your Account Credentials",
      message: accountCreatedEmailHTML(
        capitalizedName,
        user.email,
        tempPassword,
      ),
    });

    // Commit transaction
    await session.commitTransaction();

    return buildUserResponse(user);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

export async function updateUserService(id, payload) {
  const user = await UserModel.findById(id);
  if (!user) {
    throw new ApiError(`No user found for this id: ${id}`, 404);
  }

  // Block updating EMPLOYEE users - must use /employees route
  if (user.role === USER_ROLES.EMPLOYEE) {
    throw new ApiError(
      "Employee users must be updated via /employees endpoint",
      400,
    );
  }

  const { name, email, phone, role } = payload;

  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email.toLowerCase();
  if (phone !== undefined) user.phone = phone;
  if (role !== undefined && role !== USER_ROLES.ADMIN) {
    user.role = role;
  }

  const updatedUser = await user.save();
  return buildUserResponse(updatedUser);
}

export async function updateUserPasswordByAdminService(id, newPassword) {
  const user = await UserModel.findById(id).select("+password");
  if (!user) {
    throw new ApiError(`No user found for this id: ${id}`, 404);
  }

  user.password = newPassword;
  user.passwordChangedAt = Date.now();
  user.refreshTokens = [];

  const updatedUser = await user.save();
  return buildUserResponse(updatedUser);
}

export async function deleteUserService(id) {
  const user = await UserModel.findById(id);
  if (!user) {
    throw new ApiError(`No user found for this id: ${id}`, 404);
  }

  if (user.role === USER_ROLES.ADMIN) {
    throw new ApiError("Admin users cannot be deleted", 400);
  }

  // Soft delete: deactivate and anonymize
  const oldAvatarPublicId = user.image?.public_id || null;

  user.isActive = false;
  user.refreshTokens = [];
  user.name = `deleted_user_${String(user._id)}_${user.name}`;
  user.email = `deleted_${String(user._id)}_${user.email}`;
  user.image = {
    public_id: null,
    url: DEFAULT_USER_AVATAR_URL,
  };

  const deletedUser = await user.save();

  if (oldAvatarPublicId) {
    await deleteImageFromCloudinary(oldAvatarPublicId);
  }

  return buildUserResponse(deletedUser);
}

export async function toggleUserActiveService(id) {
  const user = await UserModel.findById(id);
  if (!user) {
    throw new ApiError(`No user found for this id: ${id}`, 404);
  }

  if (user.role === USER_ROLES.ADMIN) {
    throw new ApiError("Admin status cannot be toggled", 400);
  }

  const isDeactivating = user.isActive === true;
  user.isActive = !user.isActive;

  if (isDeactivating) {
    user.refreshTokens = [];
  }

  const updatedUser = await user.save();
  return buildUserResponse(updatedUser);
}

// ----- Logged-in User Services -----

export async function getMeService(currentUser) {
  const userResponse = buildUserResponse(currentUser);

  // If user is EMPLOYEE, include their employee profile
  if (currentUser.role === USER_ROLES.EMPLOYEE) {
    const employee = await EmployeeModel.findOne({ user: currentUser._id })
      .populate("department", "name")
      .populate("position", "name")
      .populate("skills", "name");

    userResponse.employeeProfile = buildEmployeeProfile(employee);
  }

  return userResponse;
}

export async function updateMeService({
  userId,
  name,
  email,
  phone,
  currency,
  skills,
  imageFile,
}) {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new ApiError("User not found", 404);
  }

  // Update user fields
  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email.toLowerCase();
  if (phone !== undefined) user.phone = phone;
  if (currency !== undefined) user.currency = currency;

  // Handle image upload
  if (imageFile) {
    validateImageFile(imageFile);

    const oldPublicId = user.image?.public_id || null;

    const uploaded = await uploadImageToCloudinary(imageFile, {
      folder: `glitci/users/${user._id}`,
      publicId: `avatar_${Date.now()}`,
    });

    user.image = uploaded;

    if (oldPublicId) {
      await deleteImageFromCloudinary(oldPublicId);
    }
  }

  await user.save();

  // If user is EMPLOYEE and skills provided, update employee profile
  if (user.role === USER_ROLES.EMPLOYEE && skills !== undefined) {
    const employee = await EmployeeModel.findOne({ user: userId });

    if (employee) {
      // Validate skills belong to the employee's position
      if (skills.length > 0) {
        const validSkillsCount = await SkillModel.countDocuments({
          _id: { $in: skills },
          position: employee.position,
        });

        if (validSkillsCount !== skills.length) {
          throw new ApiError(
            "One or more skills do not belong to your position",
            400,
          );
        }
      }

      employee.skills = skills;
      await employee.save();
    }
  }

  // Return full response with employee profile if applicable
  return getMeService(user);
}

export async function deleteMeService({ userId }) {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new ApiError("User not found", 404);
  }

  // Soft delete: deactivate and anonymize
  const oldAvatarPublicId = user.image?.public_id || null;

  user.isActive = false;
  user.refreshTokens = [];
  user.name = `deleted_user_${String(user._id)}_${user.name}`;
  user.email = `deleted_${String(user._id)}_${user.email}`;
  user.phone = null;
  user.image = {
    public_id: null,
    url: DEFAULT_USER_AVATAR_URL,
  };

  const deletedUser = await user.save();

  if (oldAvatarPublicId) {
    await deleteImageFromCloudinary(oldAvatarPublicId);
  }

  return buildUserResponse(deletedUser);
}
