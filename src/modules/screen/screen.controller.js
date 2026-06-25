import Screen from "./screen.model.js";
import User from "../auth/auth.model.js";
import Advertisement from "../advertisement/advertisement.model.js";
import GlobalSettings from "../advertisement/globalSettings.model.js";

// @desc    Create a new screen
// @route   POST /api/screens
// @access  Private (Super-Admin, City-Admin)
export const createScreen = async (req, res, next) => {
  try {
    const { assignedManagerId, assignedRunnerId, screenType, playtimeCapacity, password } = req.body;

    // Validate Manager (ad-getter)
    const manager = await User.findById(assignedManagerId);
    if (!manager || manager.role !== "ad-getter") {
      const error = new Error("Invalid assignedManagerId. Must be a user with role 'ad-getter'.");
      error.statusCode = 400;
      return next(error);
    }

    // Validate Runner
    const runner = await User.findById(assignedRunnerId);
    if (!runner || runner.role !== "runner") {
      const error = new Error("Invalid assignedRunnerId. Must be a user with role 'runner'.");
      error.statusCode = 400;
      return next(error);
    }

    // A runner can store only a single screen
    const existingScreenForRunner = await Screen.findOne({ assignedRunnerId });
    if (existingScreenForRunner) {
      const error = new Error("This runner already has a screen assigned. A runner can store only a single screen.");
      error.statusCode = 400;
      return next(error);
    }

    const cityId = manager.cityId;

    // Auto-generate username (Screen1, Screen2, etc.)
    const totalScreens = await Screen.countDocuments();
    const username = `Screen${totalScreens + 1}`;

    const screen = await Screen.create({
      ...req.body,
      username,
      screenType,
      password,
      playtimeCapacity,
      assignedManagerId,
      assignedRunnerId,
      cityId,
    });

    res.status(201).json({
      success: true,
      message: "Screen created successfully",
      data: screen,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all screens
// @route   GET /api/screens
// @access  Private
export const getScreens = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.search) {
      filter.screenBannerName = { $regex: req.query.search, $options: "i" };
    }

    if (req.cityFilter && req.cityFilter.cityId) {
      filter.cityId = req.cityFilter.cityId;
    }

    const screens = await Screen.find(filter)
      .populate("assignedManagerId", "name mobile email role cityId")
      .populate("assignedRunnerId", "name mobile email role cityId")
      .sort("-createdAt");

    res.status(200).json({
      success: true,
      count: screens.length,
      data: screens,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a screen
// @route   PUT /api/screens/:id
// @access  Private (Super-Admin, City-Admin)
export const updateScreen = async (req, res, next) => {
  try {
    const { assignedManagerId, assignedRunnerId } = req.body;

    if (assignedManagerId) {
      const manager = await User.findById(assignedManagerId);
      if (!manager || manager.role !== "ad-getter") {
        const error = new Error("Invalid manager ID");
        error.statusCode = 400;
        return next(error);
      }
    }

    if (assignedRunnerId) {
      const runner = await User.findById(assignedRunnerId);
      if (!runner || runner.role !== "runner") {
        const error = new Error("Invalid runner ID");
        error.statusCode = 400;
        return next(error);
      }
    }

    const screen = await Screen.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate("assignedManagerId", "name mobile")
      .populate("assignedRunnerId", "name mobile");

    if (!screen) {
      const error = new Error("Screen not found");
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      success: true,
      message: "Screen updated successfully",
      data: screen,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle screen status
// @route   PATCH /api/screens/:id/status
// @access  Private (Super-Admin, City-Admin)
export const toggleScreenStatus = async (req, res, next) => {
  try {
    const screen = await Screen.findById(req.params.id);

    if (!screen) {
      const error = new Error("Screen not found");
      error.statusCode = 404;
      return next(error);
    }

    screen.isActive = !screen.isActive;
    await screen.save();

    res.status(200).json({
      success: true,
      message: `Screen status changed to ${screen.isActive ? 'active' : 'inactive'}`,
      data: screen,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a screen
// @route   DELETE /api/screens/:id
// @access  Private (Super-Admin)
export const deleteScreen = async (req, res, next) => {
  try {
    const screen = await Screen.findById(req.params.id);

    if (!screen) {
      const error = new Error("Screen not found");
      error.statusCode = 404;
      return next(error);
    }

    await screen.deleteOne();

    res.status(200).json({
      success: true,
      message: "Screen deleted successfully",
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dynamic availability for a screen
// @route   GET /api/screens/:id/availability
// @access  Private
export const getScreenAvailability = async (req, res, next) => {
  try {
    const screenId = req.params.id;
    const today = new Date();
    
    // Calculate current and next month boundaries
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    
    // We want dates from today until the end of NEXT month.
    // e.g. If today is June 24, we want June 24 to July 31.
    const endOfNextMonth = new Date(currentYear, currentMonth + 2, 0); // 0th day of month+2 is last day of month+1
    
    // Fetch global settings
    const settings = await GlobalSettings.findOne();
    const totalOperatingSeconds = settings ? settings.total_operating_seconds : 360;
    const currentSlotDuration = settings ? settings.current_slot_duration_seconds : 10;
    const totalCapacity = Math.floor(totalOperatingSeconds / currentSlotDuration);

    // Query active advertisements from DB
    // We'll count how many active ads are scheduled for each date.
    const activeAds = await Advertisement.find({ status: 'active' });

    const availability = [];
    
    // Loop from today to end of next month
    for (let d = new Date(today); d <= endOfNextMonth; d.setDate(d.getDate() + 1)) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`; // YYYY-MM-DD
      
      const monthName = d.toLocaleString('default', { month: 'short' });

      // Calculate how many seconds are booked for this date
      let bookedSeconds = 0;
      activeAds.forEach(ad => {
        if (ad.scheduled_dates && ad.scheduled_dates.includes(dateString)) {
          bookedSeconds += ad.seconds_per_day || 0;
        }
      });

      const bookedSlots = Math.floor(bookedSeconds / currentSlotDuration);

      // Max capacity is totalCapacity
      const available = Math.max(0, totalCapacity - bookedSlots);

      availability.push({
        date: dateString,
        day: d.getDate(),
        month: monthName,
        available: available,
        total: totalCapacity
      });
    }

    res.status(200).json({
      success: true,
      data: availability,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login for screen devices
// @route   POST /api/screens/login
// @access  Public
export const loginScreen = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    console.log("Login Attempt - Username:", username, "Password:", password);

    if (!username || !password) {
      console.log("Login Failed - Missing credentials");
      const error = new Error("Please provide username and password");
      error.statusCode = 400;
      return next(error);
    }

    const cleanUsername = username.trim();
    const screen = await Screen.findOne({ 
      username: { $regex: new RegExp(`^${cleanUsername}$`, "i") }
    });
    
    console.log("Database lookup result:", screen ? `Found screen: ${screen.username}, isActive: ${screen.isActive}` : "Screen NOT found at all");
    
    if (!screen) {
      const error = new Error("Invalid credentials - Screen not found");
      error.statusCode = 401;
      return next(error);
    }

    if (!screen.isActive) {
      const error = new Error("Screen is inactive");
      error.statusCode = 401;
      return next(error);
    }

    // Direct password match (assuming no hashing for simplicity as it's a device screen)
    // If hashing is implemented later, we'll use bcrypt.compare
    if (screen.password !== password) {
      console.log("Login Failed - Password mismatch. Expected:", screen.password, "Got:", password);
      const error = new Error("Invalid credentials");
      error.statusCode = 401;
      return next(error);
    }

    console.log("Login Success for screen:", screen._id);
    // In a real scenario, you might generate a JWT for the screen here.
    // We can just return success for now if it's a simple app, or generate a dummy token.
    res.status(200).json({
      success: true,
      token: "screen-token-" + screen._id, // Just a placeholder token
      data: {
        _id: screen._id,
        username: screen.username,
        screenBannerName: screen.screenBannerName,
        screenType: screen.screenType,
        cityId: screen.cityId
      }
    });

  } catch (error) {
    next(error);
  }
};
