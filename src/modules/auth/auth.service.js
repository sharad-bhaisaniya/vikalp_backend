import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "./auth.model.js";
import Location from "../location/location.model.js";
import { parseExcelBuffer, validateExcelHeaders } from "../../services/excelService.js";

/**
 * generateToken
 * Creates a signed JWT token for the given user ID.
 * @param {string} id - MongoDB user _id
 * @returns {string} JWT token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

/**
 * publicRegisterCustomer
 * Public endpoint — allows anyone to self-register as a 'customer'.
 * No authentication required. Automatically generates a JWT for auto-login.
 */
export const publicRegisterCustomer = async (reqBody) => {
  const { name, email, password, mobile } = reqBody;

  if (!name || !email || !password || !mobile) {
    const error = new Error("Name, email, password, and mobile are required.");
    error.statusCode = 400;
    throw error;
  }

  const user = await User.create({
    name,
    email,
    password,
    mobile,
    role: "customer",
    cityId: null,
    registeredBy: null,
  });

  const token = generateToken(user._id);
  return { user, token };
};

/**
 * registerUser
 * Registers a new user. city-admin can only register users within their city.
 * Super-admin can register any role including other city-admins.
 */
export const registerUser = async (reqBody, requestingUser) => {
  const { name, email, password, role, cityId, mobile } = reqBody;

  const requesterRole = requestingUser.role;

  if (requesterRole === "super-admin") {
    if (!["city-admin", "ad-getter", "runner", "customer"].includes(role)) {
      const error = new Error("Super Admin can only create City Admin, Ad-Getter, Runner, Customer.");
      error.statusCode = 403;
      throw error;
    }
  } else if (requesterRole === "city-admin") {
    if (!["ad-getter", "runner", "customer"].includes(role)) {
      const error = new Error("City Admin can only create Ad-Getter, Runner, or Customer.");
      error.statusCode = 403;
      throw error;
    }
  } else if (requesterRole === "ad-getter") {
    if (!["customer", "runner"].includes(role)) {
      const error = new Error("Ad-Getter can only create Customer or Runner.");
      error.statusCode = 403;
      throw error;
    }
  } else {
    const error = new Error("You do not have permission to create users.");
    error.statusCode = 403;
    throw error;
  }

  // Inherit cityId from requesting user if they are not super-admin
  const assignedCityId =
    requestingUser.role !== "super-admin" ? requestingUser.cityId : cityId;

  // city-admin and non-super-admin roles require a cityId
  if (role !== "super-admin" && !assignedCityId) {
    const error = new Error(`cityId is required for role '${role}'.`);
    error.statusCode = 400;
    throw error;
  }

  // 1 city = 1 active city-admin rule
  if (role === "city-admin") {
    const existingAdmin = await User.findOne({ 
      cityId: assignedCityId, 
      role: "city-admin",
      status: "active" 
    });
    if (existingAdmin) {
      const error = new Error("An active City Admin already exists for this city.");
      error.statusCode = 400;
      throw error;
    }
  }

  const user = await User.create({
    name,
    email,
    password,
    mobile,
    role: role || "customer",
    cityId: assignedCityId || null,
    registeredBy: requestingUser._id,
  });

  return user;
};

/**
 * loginUser
 * Authenticates a user with email and password.
 * Returns user data and a JWT token.
 */
export const loginUser = async (email, password) => {
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    const error = new Error("Invalid email or password.");
    error.statusCode = 401;
    throw error;
  }

  if (user.status !== "active") {
    const error = new Error("Account suspended. Contact support.");
    error.statusCode = 403;
    throw error;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    const error = new Error("Invalid email or password.");
    error.statusCode = 401;
    throw error;
  }

  const token = generateToken(user._id);

  // Remove password from the returned object
  user.password = undefined;

  return { user, token };
};

/**
 * getAllUsers
 * Super-admin gets all users. city-admin gets users in their city only.
 */
export const getAllUsers = async (cityFilter, queryParams) => {
  const { role, status, page = 1, limit = 20, name, email, mobile } = queryParams;

  const filter = { ...cityFilter };
  if (role) filter.role = role;
  if (status) filter.status = status;
  
  if (name) filter.name = { $regex: name.trim(), $options: "i" };
  if (email) filter.email = { $regex: email.trim(), $options: "i" };
  if (mobile) filter.mobile = { $regex: mobile.trim(), $options: "i" };

  const skip = (Number(page) - 1) * Number(limit);

  const [users, total] = await Promise.all([
    User.find(filter)
      .populate("cityId", "cityName state")
      .populate("registeredBy", "name email role")
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    User.countDocuments(filter),
  ]);

  return {
    users,
    pagination: {
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      limit: Number(limit),
    },
  };
};

/**
 * getUserById
 * Fetch a single user by ID with city isolation enforcement.
 */
export const getUserById = async (userId, cityFilter) => {
  const filter = { _id: userId, ...cityFilter };
  const user = await User.findOne(filter)
    .populate("cityId", "cityName state")
    .populate("registeredBy", "name email role");

  if (!user) {
    const error = new Error("User not found or access denied.");
    error.statusCode = 404;
    throw error;
  }

  return user;
};

/**
 * updateUserStatus
 * Toggle user status (active/inactive/suspended).
 */
export const updateUserStatus = async (userId, status, cityFilter) => {
  const filter = { _id: userId, ...cityFilter };
  const user = await User.findOneAndUpdate(
    filter,
    { status },
    { new: true, runValidators: true }
  );

  if (!user) {
    const error = new Error("User not found or access denied.");
    error.statusCode = 404;
    throw error;
  }

  return user;
};

/**
 * getMyProfile
 * Returns the authenticated user's own profile.
 */
export const getMyProfile = async (userId) => {
  const user = await User.findById(userId).populate("cityId", "cityName state");
  if (!user) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }
  return user;
};

/**
 * bulkUploadUsers
 * Parses Excel buffer and upserts users.
 * Requires: name, email, mobile, role. cityName, state (optional for super-admin).
 */
export const bulkUploadUsers = async (fileBuffer, createdBy) => {
  const REQUIRED_HEADERS = ["name", "email", "mobile", "role"];
  const rows = parseExcelBuffer(fileBuffer);
  
  if (!rows || rows.length === 0) {
    const error = new Error("Excel file is empty or has no readable data.");
    error.statusCode = 400;
    throw error;
  }

  const { valid, missing } = validateExcelHeaders(rows, REQUIRED_HEADERS);
  if (!valid) {
    const error = new Error(`Excel file is missing required columns: ${missing.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }

  const locations = await Location.find({ isActive: true });
  const activeAdmins = await User.find({ role: "city-admin", status: "active" });
  const activeAdminCityIds = new Set(activeAdmins.map(a => a.cityId?.toString()));

  const usersToUpsert = [];
  
  for (const row of rows) {
    const normalizedRow = {};
    for (const key of Object.keys(row)) {
      normalizedRow[key.trim().toLowerCase()] = row[key];
    }
    
    const role = normalizedRow["role"]?.trim()?.toLowerCase();
    const city = normalizedRow["cityname"]?.trim();
    const state = normalizedRow["state"]?.trim();
    let cityId = null;

    if (role !== "super-admin") {
      if (!city || !state) continue; // skip invalid rows
      
      const loc = locations.find(l => 
        l.cityName.toLowerCase() === city.toLowerCase() && 
        l.state.toLowerCase() === state.toLowerCase()
      );
      
      if (!loc) continue; // Location not found
      cityId = loc._id;
      
      if (role === "city-admin" && activeAdminCityIds.has(cityId.toString())) {
         continue; // skip, 1 city admin rule
      }
      
      if (role === "city-admin") {
        activeAdminCityIds.add(cityId.toString());
      }
    }

    usersToUpsert.push({
      updateOne: {
        filter: { email: normalizedRow["email"]?.trim() },
        update: { 
          $setOnInsert: {
            name: normalizedRow["name"]?.trim(),
            email: normalizedRow["email"]?.trim(),
            mobile: normalizedRow["mobile"]?.toString().trim(),
            role,
            cityId,
            registeredBy: createdBy,
            password: await bcrypt.hash("Vikalp@123", 12),
            status: "active"
          }
        },
        upsert: true
      }
    });
  }

  if (usersToUpsert.length === 0) {
    const error = new Error("No valid user rows found or all skipped.");
    error.statusCode = 400;
    throw error;
  }

  const result = await User.bulkWrite(usersToUpsert, { ordered: false });
  return {
    insertedCount: result.upsertedCount || 0,
    totalRowsProcessed: rows.length
  };
};

export const bulkDeleteUsers = async (ids) => {
  const result = await User.deleteMany({ _id: { $in: ids } });
  return result;
};
