import * as authService from "./auth.service.js";

/**
 * @route   POST /api/auth/register/customer
 * @desc    Public self-registration for customers (no auth required)
 * @access  Public
 */
export const publicRegisterCustomer = async (req, res, next) => {
  try {
    const { name, email, password, mobile } = req.body;
    if (!name || !email || !password || !mobile) {
      const error = new Error("Name, email, password, and mobile are required.");
      error.statusCode = 400;
      return next(error);
    }
    const { user, token } = await authService.publicRegisterCustomer(req.body);
    res.status(201).json({
      success: true,
      message: "Account created successfully! Welcome to Vikalp Promotions.",
      token,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Private [super-admin, city-admin]
 */
export const register = async (req, res, next) => {
  try {
    const user = await authService.registerUser(req.body, req.user);
    res.status(201).json({
      success: true,
      message: "User registered successfully.",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Login user and return JWT
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      const error = new Error("Email and password are required.");
      error.statusCode = 400;
      return next(error);
    }

    const { user, token } = await authService.loginUser(email, password);

    res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get authenticated user's own profile
 * @access  Private [all roles]
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMyProfile(req.user._id);
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/auth/users
 * @desc    Get all users (filtered by city for city-admin)
 * @access  Private [super-admin, city-admin]
 */
export const getUsers = async (req, res, next) => {
  try {
    const result = await authService.getAllUsers(req.cityFilter, req.query);
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/auth/users/:id
 * @desc    Get a single user by ID
 * @access  Private [super-admin, city-admin]
 */
export const getUserById = async (req, res, next) => {
  try {
    const user = await authService.getUserById(req.params.id, req.cityFilter);
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/auth/users/:id/status
 * @desc    Update user account status (active/inactive/suspended)
 * @access  Private [super-admin, city-admin]
 */
export const updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) {
      const error = new Error("Status field is required.");
      error.statusCode = 400;
      return next(error);
    }

    const user = await authService.updateUserStatus(
      req.params.id,
      status,
      req.cityFilter
    );

    res.status(200).json({
      success: true,
      message: `User status updated to '${status}'.`,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/users/upload
 * @desc    Bulk upload users via Excel/CSV file
 * @access  Private [auth:create]
 */
export const uploadUsers = async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error("Please upload an Excel (.xlsx) or CSV file.");
      error.statusCode = 400;
      return next(error);
    }

    const result = await authService.bulkUploadUsers(
      req.file.buffer,
      req.user._id
    );

    res.status(201).json({
      success: true,
      message: `Bulk upload complete. ${result.insertedCount} users inserted.`,
      data: result,
    });
  } catch (error) {
    if (error.insertedDocs || error.writeErrors) {
      return res.status(207).json({
        success: "partial",
        message: "Some records were inserted, others failed (possibly duplicates).",
        insertedCount: error.insertedDocs?.length || 0,
        errors: error.writeErrors?.length || 0,
      });
    }
    next(error);
  }
};

/**
 * @route   POST /api/auth/users/bulk-delete
 * @desc    Bulk delete users by array of IDs
 * @access  Private [super-admin, city-admin]
 */
export const bulkDeleteUsers = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      const error = new Error("Please provide an array of user IDs.");
      error.statusCode = 400;
      return next(error);
    }

    const result = await authService.bulkDeleteUsers(ids);

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} users.`,
    });
  } catch (error) {
    next(error);
  }
};
