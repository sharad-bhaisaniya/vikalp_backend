import Screen from "./screen.model.js";
import Advertisement from "../advertisement/advertisement.model.js";

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

    const playlist = activeCampaigns
      .filter(ad => {
        const currentPlayed = ad.daily_consumption?.[today] || 0;
        return currentPlayed < ad.seconds_per_day;
      })
      .map(ad => ({
        campaignId: ad._id,
        adTitle: ad.ad_title,
        mediaUrl: ad.media_url,
        layout: "fullscreen",
        maxDuration: ad.total_seconds_purchased > 10 ? 10 : ad.total_seconds_purchased 
      }));

    return res.status(200).json({
      success: true,
      screenInfo: {
        screenType: screen.screenType,
        resolution: screen.screenResolution,
        orientation: screen.orientation
      },
      playlist
    });

  } catch (error) {
    console.error("Error fetching playlist feed:", error);
    return res.status(500).json({ success: false, message: "Server error retrieving playlist feed" });
  }
};
