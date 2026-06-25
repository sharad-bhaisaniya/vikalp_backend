import Location from "./location.model.js";
import {
  parseExcelBuffer,
  validateExcelHeaders,
} from "../../services/excelService.js";

const REQUIRED_EXCEL_HEADERS = ["cityname", "state"];

/**
 * searchLocations
 * Returns paginated locations with optional filters:
 * - cityName: case-insensitive partial match
 * - pincode: exact match (only applied if provided)
 * - state: case-insensitive partial match
 */
export const searchLocations = async (queryParams) => {
  const { cityName, pincode, state, isActive, page = 1, limit = 20 } = queryParams;

  const filter = {};
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true' || isActive === true;
  } else {
    filter.isActive = true; // Default to active
  }

  if (cityName) {
    filter.cityName = { $regex: cityName.trim(), $options: "i" };
  }

  if (state) {
    filter.state = { $regex: state.trim(), $options: "i" };
  }

  // Pincode filter is strictly optional
  if (pincode) {
    filter.pincode = pincode.trim();
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [locations, total] = await Promise.all([
    Location.find(filter)
      .populate("createdBy", "name email")
      .skip(skip)
      .limit(Number(limit))
      .sort({ cityName: 1 }),
    Location.countDocuments(filter),
  ]);

  return {
    locations,
    pagination: {
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      limit: Number(limit),
    },
  };
};

/**
 * getLocationById
 * Fetch a single location document by its ID.
 */
export const getLocationById = async (id) => {
  const location = await Location.findById(id).populate("createdBy", "name email");
  if (!location) {
    const error = new Error("Location not found.");
    error.statusCode = 404;
    throw error;
  }
  return location;
};

/**
 * createLocation
 * Creates a single location record.
 */
export const createLocation = async (data, createdBy) => {
  const location = await Location.create({ ...data, createdBy });
  return location;
};

/**
 * updateLocation
 * Updates a location by ID.
 */
export const updateLocation = async (id, data) => {
  const location = await Location.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });

  if (!location) {
    const error = new Error("Location not found.");
    error.statusCode = 404;
    throw error;
  }

  return location;
};

/**
 * deleteLocation
 * Soft deletes a location by setting isActive to false.
 */
export const deleteLocation = async (id) => {
  const location = await Location.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );

  if (!location) {
    const error = new Error("Location not found.");
    error.statusCode = 404;
    throw error;
  }

  return location;
};

/**
 * bulkDeleteLocations
 * Permanently deletes multiple locations.
 */
export const bulkDeleteLocations = async (ids) => {
  const result = await Location.deleteMany(
    { _id: { $in: ids } }
  );
  return result;
};

/**
 * bulkUploadLocations
 * Parses an uploaded Excel/CSV file buffer and bulk-inserts into MongoDB.
 * Uses ordered: false so a single duplicate doesn't abort the whole batch.
 *
 * Expected Excel Headers (case-insensitive): cityName, state, pincode (optional)
 */
export const bulkUploadLocations = async (fileBuffer, createdBy) => {
  // 1. Parse the buffer
  const rows = parseExcelBuffer(fileBuffer);

  if (!rows || rows.length === 0) {
    const error = new Error("Excel file is empty or has no readable data.");
    error.statusCode = 400;
    throw error;
  }

  // 2. Validate required headers
  const { valid, missing } = validateExcelHeaders(rows, REQUIRED_EXCEL_HEADERS);
  if (!valid) {
    const error = new Error(
      `Excel file is missing required columns: ${missing.join(", ")}. Please ensure headers are: cityName, state (pincode is optional).`
    );
    error.statusCode = 400;
    throw error;
  }

  // 3. Map and sanitize rows
  const locations = rows
    .map((row) => {
      // Normalize keys to handle case differences in Excel headers
      const normalizedRow = {};
      for (const key of Object.keys(row)) {
        normalizedRow[key.trim().toLowerCase()] = row[key];
      }

      const cityName = normalizedRow["cityname"]?.trim();
      const state = normalizedRow["state"]?.trim();
      const pincode = normalizedRow["pincode"]?.toString().trim() || null;

      if (!cityName || !state) return null; // Skip empty rows

      return {
        cityName,
        state,
        pincode: pincode || null,
        createdBy,
      };
    })
    .filter(Boolean); // Remove null entries

  if (locations.length === 0) {
    const error = new Error("No valid location rows found in the uploaded file.");
    error.statusCode = 400;
    throw error;
  }

  // 4. Bulk upsert to avoid duplicates
  const bulkOps = locations.map((loc) => ({
    updateOne: {
      filter: {
        cityName: loc.cityName,
        state: loc.state,
        pincode: loc.pincode
      },
      update: { $setOnInsert: loc },
      upsert: true
    }
  }));

  const result = await Location.bulkWrite(bulkOps, { ordered: false });

  return {
    insertedCount: result.upsertedCount || 0,
    totalRowsProcessed: rows.length,
    skippedRows: rows.length - locations.length,
  };
};
