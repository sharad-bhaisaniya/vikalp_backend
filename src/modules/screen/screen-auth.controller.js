import Screen from "./screen.model.js";
import Advertisement from "../advertisement/advertisement.model.js";
import GlobalSettings from "../advertisement/globalSettings.model.js";

/**
 * Validates the hardware screen and provides the next continuous array of active ads.
 */
export const getPlaylistFeed = async (req, res) => {
  try {
    const { screenId } = req.params;

    // 1. Verify if the screen exists and isActive
    const screen = await Screen.findById(screenId);
    if (!screen) {
      return res.status(404).json({ success: false, message: "Screen not found" });
    }

    if (!screen.isActive) {
      return res.status(403).json({ success: false, message: "Screen is deactivated" });
    }

    // 2. Query Campaign (Advertisement) model
    // Assuming Advertisement model represents the Campaigns and can target specific screens.
    // We add a virtual or implicit match (e.g. status: 'active', remaining duration > 0)
    
    const today = new Date().toISOString().split("T")[0];

    const activeCampaigns = await Advertisement.find({
      status: "active",
      scheduled_dates: today,
      total_seconds_purchased: { $gt: 0 }
    })
    .select("ad_title media_url total_seconds_purchased scheduled_dates daily_consumption seconds_per_day last_played_at")
    .sort({ last_played_at: 1 })
    .lean();

    let settings = await GlobalSettings.findOne();
    if (!settings) {
      settings = { total_operating_seconds: 360, current_slot_duration_seconds: 12 };
    }
    
    const slotDuration = settings.current_slot_duration_seconds || 12;
    const totalSlots = Math.floor((settings.total_operating_seconds || 360) / slotDuration);

    const activeBookedAds = activeCampaigns
      .filter(ad => {
        const currentPlayed = ad.daily_consumption?.[today] || 0;
        return currentPlayed < ad.seconds_per_day;
      })
      .map(ad => ({
        campaignId: ad._id,
        adTitle: ad.ad_title,
        mediaUrl: ad.media_url,
        layout: "fullscreen",
        maxDuration: slotDuration
      }));

    // Construct full loop playlist
    const playlist = [];
    
    // Distribute booked ads
    activeBookedAds.forEach(ad => {
      playlist.push(ad);
    });

    // Pad remaining slots with default ad
    const defaultAd = {
      campaignId: null, // null so frontend doesn't log it
      adTitle: "Vikalp Promotional Ad",
      mediaUrl: "https://www.w3schools.com/html/mov_bbb.mp4", // Dummy default video or use an actual one
      layout: "fullscreen",
      maxDuration: slotDuration
    };

    while (playlist.length < totalSlots) {
      playlist.push(defaultAd);
    }

    return res.status(200).json({
      success: true,
      screenInfo: {
        screenType: screen.screenType,
        resolution: screen.screenResolution,
        orientation: screen.orientation
      },
      loopSettings: {
        totalOperatingSeconds: settings.total_operating_seconds || 360,
        slotDuration: slotDuration,
        totalSlots: totalSlots
      },
      playlist
    });

  } catch (error) {
    console.error("Error fetching playlist feed:", error);
    return res.status(500).json({ success: false, message: "Server error retrieving playlist feed" });
  }
};
