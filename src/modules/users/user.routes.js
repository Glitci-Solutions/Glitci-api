// src/modules/users/user.routes.js
import { Router } from "express";
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  updateUserPassword,
  deleteUser,
  toggleUserActive,
  getMe,
  updateMe,
  deleteMe,
} from "./user.controller.js";
import {
  createUserValidator,
  updateUserValidator,
  updateUserPasswordValidator,
  userIdValidator,
  updateMeValidator,
} from "./user.validator.js";
import { protect, allowedTo } from "../auth/auth.middleware.js";
import { uploadSingleImage } from "../../shared/middlewares/uploadMiddleware.js";
import { USER_ROLES } from "../../shared/constants/userRoles.enums.js";

const router = Router();

// ----- Logged-in User Routes (must be before /:id routes) -----

router.get("/me", protect, getMe);
router.patch(
  "/me",
  protect,
  uploadSingleImage("image"),
  updateMeValidator,
  updateMe,
);
router.delete("/me", protect, deleteMe);

// ----- Admin Routes -----
router.use(protect, allowedTo(USER_ROLES.ADMIN, USER_ROLES.OPERATION));

router.route("/").get(getUsers).post(createUserValidator, createUser);

router
  .route("/:id")
  .get(userIdValidator, getUser)
  .patch(updateUserValidator, updateUser)
  .delete(userIdValidator, deleteUser);

router.patch("/:id/password", updateUserPasswordValidator, updateUserPassword);
router.patch("/:id/toggle-active", userIdValidator, toggleUserActive);

export default router;
