import * as locationService from "./location.service.js";

/**
 * @route   GET /api/locations
 * @desc    Search/List locations with optional filters (cityName, pincode, state)
 * @access  Private [all authenticated roles]
 */
export const getLocations = async (req, res, next) => {
  try {
    const result = await locationService.searchLocations(req.query);
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/locations/:id
 * @desc    Get a single location by ID
 * @access  Private [super-admin, city-admin]
 */
export const getLocation = async (req, res, next) => {
  try {
    const location = await locationService.getLocationById(req.params.id);
    res.status(200).json({
      success: true,
      data: location,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/locations
 * @desc    Create a new location manually
 * @access  Private [super-admin]
 */
export const createLocation = async (req, res, next) => {
  try {
    const location = await locationService.createLocation(req.body, req.user._id);
    res.status(201).json({
      success: true,
      message: "Location created successfully.",
      data: location,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/locations/:id
 * @desc    Update a location by ID
 * @access  Private [super-admin]
 */
export const updateLocation = async (req, res, next) => {
  try {
    const location = await locationService.updateLocation(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: "Location updated successfully.",
      data: location,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/locations/:id
 * @desc    Soft delete a location
 * @access  Private [super-admin]
 */
export const deleteLocation = async (req, res, next) => {
  try {
    await locationService.deleteLocation(req.params.id);
    res.status(200).json({
      success: true,
      message: "Location deactivated successfully.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/locations/upload
 * @desc    Bulk upload locations via Excel/CSV file
 * @access  Private [super-admin]
 */
export const uploadLocations = async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error("Please upload an Excel (.xlsx) or CSV file.");
      error.statusCode = 400;
      return next(error);
    }

    const result = await locationService.bulkUploadLocations(
      req.file.buffer,
      req.user._id
    );

    res.status(201).json({
      success: true,
      message: `Bulk upload complete. ${result.insertedCount} locations inserted.`,
      data: result,
    });
  } catch (error) {
    // Handle partial insertMany errors (ordered: false)
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
 * @route   POST /api/locations/bulk-delete
 * @desc    Bulk delete locations by array of IDs
 * @access  Private [admin/super-admin]
 */
export const bulkDeleteLocations = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      const error = new Error("Please provide an array of location IDs.");
      error.statusCode = 400;
      return next(error);
    }

    const result = await locationService.bulkDeleteLocations(ids);

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} locations.`,
    });
  } catch (error) {
    next(error);
  }
};
