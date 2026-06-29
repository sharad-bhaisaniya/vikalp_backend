import Advertisement from "./advertisement.model.js";
import GlobalSettings from "./globalSettings.model.js";
import mongoose from "mongoose";
import { walletService } from "../wallet/wallet.service.js";
import Screen from "../screen/screen.model.js";
import AdLog from "./adLog.model.js";

class AdvertisementService {
  async getGlobalSettings() {
    let settings = await GlobalSettings.findOne();
    if (!settings) {
      settings = await GlobalSettings.create({
        total_operating_seconds: 360,
        current_slot_duration_seconds: 12,
        price_per_second: 1.5,
      });
    }
    return settings;
  }

  getTodayDateString() {
    return new Date().toISOString().split("T")[0];
  }

  async createAdvertisement(data) {
    const { customer_id, customer_name, ad_title, media_url, scheduled_dates, runner_id } = data;
    if (!scheduled_dates || scheduled_dates.length === 0) {
      throw new Error("Must select at least one scheduled date");
    }
    if (!runner_id) {
      throw new Error("Runner must be selected");
    }
    if (!customer_id) {
      throw new Error("Customer must be selected");
    }

    const settings = await this.getGlobalSettings();
    const slotDuration = settings.current_slot_duration_seconds;
    const pricePerSecond = settings.price_per_second ? parseFloat(settings.price_per_second.toString()) : 0;
    const loopDurationMins = settings.total_operating_seconds / 60; // Usually 6 mins

    // Get screen assigned to this runner
    const screen = await Screen.findOne({ assignedRunnerId: runner_id });
    const playtimeHours = screen && screen.playtimeCapacity > 0 ? screen.playtimeCapacity : 8;
    const playtimeMins = playtimeHours * 60;
    const loopsPerDay = Math.floor(playtimeMins / loopDurationMins);

    const slots_per_day = 1; // logical slot booking count
    const seconds_per_day = slotDuration * loopsPerDay; // Total seconds played in a day
    const total_cost = scheduled_dates.length * seconds_per_day * pricePerSecond;

    for (const date of scheduled_dates) {
      const existing = await Advertisement.findOne({
        runner_id,
        scheduled_dates: date,
        status: "active",
      });
      if (existing) {
        throw new Error(`Runner already has a slot booked on ${date}`);
      }
    }

    // Check and deduct from wallet
    const wallet = await walletService.getOrCreateWallet(customer_id);
    if (wallet.balance < total_cost) {
      throw new Error("Insufficient wallet balance for this booking.");
    }

    await walletService.holdAmount(
      customer_id, 
      total_cost, 
      `Hold for slot booking: ${ad_title || 'Ad'} on ${scheduled_dates.length} date(s)`
    );

    const ad = await Advertisement.create({
      user_id: customer_id, // Use actual customer ID
      runner_id,
      customer_name,
      ad_title: ad_title || `Ad for ${customer_name}`,
      media_url: media_url || "",
      total_seconds_purchased: seconds_per_day * scheduled_dates.length,
      purchased_time_value: slots_per_day,
      purchased_time_unit: "seconds",
      scheduled_dates,
      slots_per_day,
      seconds_per_day,
      total_cost,
      daily_consumption: {},
      status: "active"
    });

    return ad;
  }

  async updateGlobalSettings(totalOperatingSeconds, duration, pricePerSecond) {
    if (duration <= 0) {
      throw new Error("Invalid slot duration");
    }
    if (totalOperatingSeconds <= 0) {
      throw new Error("Invalid operating seconds");
    }
    if (pricePerSecond !== undefined && pricePerSecond < 0) {
      throw new Error("Invalid price per second");
    }

    if (totalOperatingSeconds) {
      const today = this.getTodayDateString();
      const ads = await Advertisement.find({ status: "active", scheduled_dates: today });
      let totalBookedSecondsToday = 0;
      for (const ad of ads) {
        totalBookedSecondsToday += ad.seconds_per_day;
      }

      if (totalOperatingSeconds < totalBookedSecondsToday) {
        await Advertisement.deleteMany({});
        console.log("Cleared old advertisements to accommodate new smaller loop size.");
      }
    }

    const settings = await this.getGlobalSettings();
    if (duration) settings.current_slot_duration_seconds = duration;
    if (totalOperatingSeconds) settings.total_operating_seconds = totalOperatingSeconds;

    // Explicitly parse to string/number format before assigning to Decimal128 field
    if (pricePerSecond !== undefined) {
      settings.price_per_second = mongoose.Types.Decimal128.fromString(pricePerSecond.toString());
    }

    await settings.save();
    return settings;
  }

  async getDashboardStats() {
    const settings = await this.getGlobalSettings();
    const today = this.getTodayDateString();
    const ads = await Advertisement.find({ status: "active" });

    let totalBookedSecondsToday = 0;
    let activeTodayCount = 0;

    const activeCampaigns = ads.map(ad => {
      const playedToday = ad.daily_consumption?.get(today) || 0;
      const remainingToday = Math.max(0, ad.seconds_per_day - playedToday);
      const isScheduledToday = ad.scheduled_dates.includes(today);

      if (isScheduledToday) {
        totalBookedSecondsToday += ad.seconds_per_day;
        activeTodayCount++;
      }

      return {
        id: ad._id,
        customer_name: ad.customer_name,
        total_seconds_purchased: ad.total_seconds_purchased,
        scheduled_dates: ad.scheduled_dates,
        seconds_per_day: ad.seconds_per_day,
        played_today: playedToday,
        remaining_today: isScheduledToday ? remainingToday : 0,
        dynamic_slots_remaining: isScheduledToday ? Math.floor(remainingToday / settings.current_slot_duration_seconds) : 0,
        is_scheduled_today: isScheduledToday
      };
    });

    const totalFreeTime = settings.total_operating_seconds - totalBookedSecondsToday;

    // Convert price to absolute number for safe delivery to front-end JSON
    const pricePerSecondNum = settings.price_per_second ? parseFloat(settings.price_per_second.toString()) : 0;

    return {
      settings: {
        total_operating_seconds: settings.total_operating_seconds,
        current_slot_duration_seconds: settings.current_slot_duration_seconds,
        price_per_second: pricePerSecondNum
      },
      metrics: {
        total_booked_seconds: totalBookedSecondsToday,
        total_free_time: totalFreeTime > 0 ? totalFreeTime : 0,
        active_accounts: activeTodayCount,
      },
      campaigns: activeCampaigns,
    };
  }

  async getNextAd() {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const settings = await this.getGlobalSettings();
      const currentSlotDuration = settings.current_slot_duration_seconds;
      const today = this.getTodayDateString();

      const candidates = await Advertisement.find({
        status: "active",
        scheduled_dates: today
      }).sort({ last_played_at: 1 }).session(session);

      let nextAd = null;
      let playedToday = 0;

      for (const ad of candidates) {
        const currentPlayed = ad.daily_consumption?.get(today) || 0;
        if (currentPlayed < ad.seconds_per_day) {
          nextAd = ad;
          playedToday = currentPlayed;
          break;
        }
      }

      if (!nextAd) {
        await session.abortTransaction();
        session.endSession();
        return null;
      }

      const remainingForToday = nextAd.seconds_per_day - playedToday;
      const timeToDeduct = Math.min(remainingForToday, currentSlotDuration);

      // Only update last_played_at to rotate to the next ad in subsequent requests
      nextAd.last_played_at = new Date();
      await nextAd.save({ session });

      await session.commitTransaction();
      session.endSession();

      return {
        ad: nextAd,
        played_for_seconds: timeToDeduct, // Recommended time to play
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  async logAdPlay(advertisementId, playedSeconds) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const ad = await Advertisement.findById(advertisementId).session(session);
      if (!ad) {
        throw new Error("Advertisement not found");
      }

      const settings = await this.getGlobalSettings();
      const today = this.getTodayDateString();

      // Update daily consumption
      if (!ad.daily_consumption) {
        ad.daily_consumption = new Map();
      }
      const currentPlayed = ad.daily_consumption.get(today) || 0;
      ad.daily_consumption.set(today, currentPlayed + playedSeconds);
      
      await ad.save({ session });

      // Create log for the playback
      const pricePerSecondNum = settings.price_per_second ? parseFloat(settings.price_per_second.toString()) : 0;
      const totalCostForPlay = playedSeconds * pricePerSecondNum;

      await AdLog.create([{
        advertisement_id: ad._id,
        user_id: ad.user_id,
        runner_id: ad.runner_id,
        date: today,
        played_seconds: playedSeconds,
        price_per_second: mongoose.Types.Decimal128.fromString(pricePerSecondNum.toString()),
        total_cost: mongoose.Types.Decimal128.fromString(totalCostForPlay.toString())
      }], { session });

      await session.commitTransaction();
      session.endSession();

      return { success: true, message: "Ad play logged successfully" };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  async checkAvailability(dates) {
    const settings = await this.getGlobalSettings();
    const totalOperatingSeconds = settings.total_operating_seconds;
    const slotDuration = settings.current_slot_duration_seconds;
    const totalSlotsPerDay = Math.floor(totalOperatingSeconds / slotDuration);

    const ads = await Advertisement.find({
      status: "active",
      scheduled_dates: { $in: dates }
    });

    const availability = {};
    for (const date of dates) {
      let bookedSlotsForDate = 0;
      for (const ad of ads) {
        if (ad.scheduled_dates.includes(date)) {
          bookedSlotsForDate += ad.slots_per_day || 1;
        }
      }
      availability[date] = Math.max(0, totalSlotsPerDay - bookedSlotsForDate);
    }

    return {
      total_operating_seconds: totalOperatingSeconds,
      total_slots_per_day: totalSlotsPerDay,
      slot_duration_seconds: slotDuration,
      availability
    };
  }

  async getRunnerSlotAvailability(runnerId, dates) {
    const settings = await this.getGlobalSettings();
    const totalOperatingSeconds = settings.total_operating_seconds;
    const slotDuration = settings.current_slot_duration_seconds;
    const totalSlotsPerDay = Math.floor(totalOperatingSeconds / slotDuration);

    const allAds = await Advertisement.find({
      status: "active",
      scheduled_dates: { $in: dates }
    });

    const runnerAds = await Advertisement.find({
      runner_id: runnerId,
      status: "active",
      scheduled_dates: { $in: dates }
    });

    const result = {};
    for (const date of dates) {
      const totalBooked = allAds.filter(a => a.scheduled_dates.includes(date))
        .reduce((sum, a) => sum + (a.slots_per_day || 1), 0);
      const runnerBooked = runnerAds.some(a => a.scheduled_dates.includes(date));

      result[date] = {
        total_slots: totalSlotsPerDay,
        booked_slots: totalBooked,
        available_slots: Math.max(0, totalSlotsPerDay - totalBooked),
        runner_already_booked: runnerBooked,
      };
    }
    return result;
  }

  async getAllBookings(filters = {}) {
    const settings = await this.getGlobalSettings();
    const slotDuration = settings.current_slot_duration_seconds;
    const totalSlotsPerDay = Math.floor(settings.total_operating_seconds / slotDuration);

    const query = { status: 'active' };
    if (filters.customer_id) query.user_id = filters.customer_id;
    if (filters.runner_id) query.runner_id = filters.runner_id;

    const ads = await Advertisement.find(query)
      .populate('runner_id', 'name mobile email role')
      .sort({ createdAt: -1 });

    return ads.map(ad => {
      const runner = ad.runner_id;
      return {
        id: ad._id,
        customer_name: ad.customer_name,
        ad_title: ad.ad_title,
        media_url: ad.media_url,
        runner: runner ? { id: runner._id, name: runner.name, mobile: runner.mobile, email: runner.email } : null,
        scheduled_dates: ad.scheduled_dates,
        slots_per_day: ad.slots_per_day || 1,
        slot_duration_seconds: slotDuration,
        total_slots_per_day: totalSlotsPerDay,
        status: ad.status,
        createdAt: ad.createdAt,
      };
    });
  }
  async updateMedia(advertisementId, mediaUrl) {
    if (!mediaUrl) {
      throw new Error("Media URL is required");
    }
    const ad = await Advertisement.findById(advertisementId);
    if (!ad) {
      throw new Error("Advertisement not found");
    }
    ad.media_url = mediaUrl;
    await ad.save();
    return ad;
  }
}

export const advertisementService = new AdvertisementService();

// Controller helper
// export async function updateGlobalSettingsController(req, res) {
//   try {
//     const { total_operating_seconds, duration, price_per_second } = req.body;
//     const updatedSettings = await advertisementService.updateGlobalSettings(
//       total_operating_seconds,
//       duration,
//       price_per_second !== undefined ? parseFloat(price_per_second) : undefined // Parsed to Float
//     );
//     res.status(200).json({ message: "Global settings updated", settings: updatedSettings });
//   } catch (error) {
//     console.error("Error in updateGlobalSettings:", error);
//     res.status(400).json({ message: error.message });
//   }
// }