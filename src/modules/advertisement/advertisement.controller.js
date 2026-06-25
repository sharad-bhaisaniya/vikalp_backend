import { advertisementService } from "./advertisement.service.js";

class AdvertisementController {
  async getNextAd(req, res) {
    try {
      const result = await advertisementService.getNextAd();
      if (!result) {
        return res.status(404).json({ message: "No active advertisements found." });
      }
      res.status(200).json(result);
    } catch (error) {
      console.error("Error in getNextAd:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  async getGlobalSettings(req, res) {
    try {
      const settings = await advertisementService.getGlobalSettings();
      res.status(200).json(settings);
    } catch (error) {
      console.error("Error in getGlobalSettings:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  // async updateGlobalSettings(req, res) {
  //   try {
  //     const { total_operating_seconds, duration, price_per_second } = req.body;
  //     const updatedSettings = await advertisementService.updateGlobalSettings(
  //       total_operating_seconds,
  //       duration,
  //       price_per_second !== undefined ? Number(price_per_second) : undefined
  //     );
  //     res.status(200).json({ message: "Global settings updated", settings: updatedSettings });
  //   } catch (error) {
  //     console.error("Error in updateGlobalSettings:", error);
  //     res.status(400).json({ message: error.message });
  //   }
  // }

  async updateGlobalSettings(req, res) {
    try {
      const { total_operating_seconds, duration, price_per_second } = req.body;

      const updatedSettings = await advertisementService.updateGlobalSettings(
        total_operating_seconds,
        duration,
        price_per_second !== undefined ? parseFloat(price_per_second) : undefined
      );

      res.status(200).json({ message: "Global settings updated", settings: updatedSettings });
    } catch (error) {
      console.error("Error in updateGlobalSettings:", error);
      res.status(400).json({ message: error.message });
    }
  }

  async uploadMedia(req, res, next) {
    try {
      if (!req.file) {
        const error = new Error("No file uploaded");
        error.statusCode = 400;
        throw error;
      }
      
      const fileUrl = `/uploads/ads/${req.file.filename}`;
      
      res.status(200).json({
        success: true,
        data: {
          url: fileUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getDashboardStats(req, res) {
    try {
      const stats = await advertisementService.getDashboardStats();
      res.status(200).json(stats);
    } catch (error) {
      console.error("Error in getDashboardStats:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  async createAdvertisement(req, res) {
    try {
      const ad = await advertisementService.createAdvertisement(req.body);
      res.status(201).json({ message: "Advertisement created successfully", ad });
    } catch (error) {
      console.error("Error in createAdvertisement:", error);
      res.status(400).json({ message: error.message });
    }
  }

  async checkAvailability(req, res) {
    try {
      const { dates } = req.body;
      if (!dates || !Array.isArray(dates)) {
        return res.status(400).json({ message: "Dates array is required" });
      }
      const availability = await advertisementService.checkAvailability(dates);
      res.status(200).json(availability);
    } catch (error) {
      console.error("Error in checkAvailability:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  async getRunnerSlotAvailability(req, res) {
    try {
      const { runnerId } = req.params;
      const { dates } = req.body;
      if (!dates || !Array.isArray(dates)) {
        return res.status(400).json({ message: "Dates array is required" });
      }
      const result = await advertisementService.getRunnerSlotAvailability(runnerId, dates);
      res.status(200).json(result);
    } catch (error) {
      console.error("Error in getRunnerSlotAvailability:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  async getAllBookings(req, res) {
    try {
      const { customer_id, runner_id } = req.query;
      const bookings = await advertisementService.getAllBookings({ customer_id, runner_id });
      res.status(200).json({ success: true, data: bookings });
    } catch (error) {
      console.error("Error in getAllBookings:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  async updateAdvertisementMedia(req, res) {
    try {
      const { id } = req.params;
      const { mediaUrl } = req.body;
      const ad = await advertisementService.updateMedia(id, mediaUrl);
      res.status(200).json({ success: true, message: "Media updated successfully", ad });
    } catch (error) {
      console.error("Error in updateAdvertisementMedia:", error);
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

export const advertisementController = new AdvertisementController();
