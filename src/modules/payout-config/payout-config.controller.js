import { payoutConfigService } from "./payout-config.service.js";

export const getConfig = async (req, res) => {
  try {
    const config = await payoutConfigService.getConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateConfig = async (req, res) => {
  try {
    const updatedConfig = await payoutConfigService.updateConfig(req.body);
    res.status(200).json(updatedConfig);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const simulatePayout = async (req, res) => {
  try {
    const { totalAmount, involvedRoles } = req.body;
    if (!totalAmount) {
      return res.status(400).json({ message: "totalAmount is required" });
    }
    
    const result = await payoutConfigService.calculatePayout(totalAmount, involvedRoles);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
