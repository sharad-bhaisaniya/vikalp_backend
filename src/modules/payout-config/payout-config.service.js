import PayoutConfig from "./payout-config.model.js";

class PayoutConfigService {
  async getConfig() {
    let config = await PayoutConfig.findOne();
    if (!config) {
      // Create a default if none exists
      config = await PayoutConfig.create({
        configName: "Default 100% Split",
        distributionType: "percentage",
        splits: {
          adminShare: 30,
          cityAdminShare: 20,
          adGetterShare: 10,
          runnerShare: 40,
        },
      });
    }
    return config;
  }

  async updateConfig(data) {
    if (data.distributionType === "percentage") {
      const total =
        Number(data.splits.adminShare) +
        Number(data.splits.cityAdminShare) +
        Number(data.splits.adGetterShare) +
        Number(data.splits.runnerShare);

      if (total !== 100) {
        throw new Error("For percentage distribution, the sum of all shares must be exactly 100.");
      }
    }

    let config = await PayoutConfig.findOne();
    if (!config) {
      return await PayoutConfig.create(data);
    } else {
      config.configName = data.configName;
      config.distributionType = data.distributionType;
      config.splits = data.splits;
      await config.save();
      return config;
    }
  }

  /**
   * Calculates the split based on the active config and the involved hierarchy.
   * Roll-up logic: If a middle-man is skipped, their share rolls up to the Admin.
   * @param {Number} totalAmount The total amount to distribute
   * @param {Object} involvedRoles Booleans indicating which roles are involved
   */
  async calculatePayout(totalAmount, involvedRoles = {
    hasCityAdmin: true,
    hasAdGetter: true,
    hasRunner: true
  }) {
    const config = await this.getConfig();
    const { adminShare, cityAdminShare, adGetterShare, runnerShare } = config.splits;

    let adminPercentage = adminShare;
    let cityAdminPercentage = cityAdminShare;
    let adGetterPercentage = adGetterShare;
    let runnerPercentage = runnerShare;

    // Roll-up logic for missing hierarchy
    if (!involvedRoles.hasRunner) {
      adminPercentage += runnerPercentage;
      runnerPercentage = 0;
    }
    if (!involvedRoles.hasAdGetter) {
      adminPercentage += adGetterPercentage;
      adGetterPercentage = 0;
    }
    if (!involvedRoles.hasCityAdmin) {
      adminPercentage += cityAdminPercentage;
      cityAdminPercentage = 0;
    }

    if (config.distributionType === "percentage") {
      return {
        adminAmount: (totalAmount * adminPercentage) / 100,
        cityAdminAmount: (totalAmount * cityAdminPercentage) / 100,
        adGetterAmount: (totalAmount * adGetterPercentage) / 100,
        runnerAmount: (totalAmount * runnerPercentage) / 100,
      };
    } else {
      let adminFixed = adminShare;
      let cityAdminFixed = cityAdminShare;
      let adGetterFixed = adGetterShare;
      let runnerFixed = runnerShare;

      if (!involvedRoles.hasRunner) {
        adminFixed += runnerFixed;
        runnerFixed = 0;
      }
      if (!involvedRoles.hasAdGetter) {
        adminFixed += adGetterFixed;
        adGetterFixed = 0;
      }
      if (!involvedRoles.hasCityAdmin) {
        adminFixed += cityAdminFixed;
        cityAdminFixed = 0;
      }

      return {
        adminAmount: adminFixed,
        cityAdminAmount: cityAdminFixed,
        adGetterAmount: adGetterFixed,
        runnerAmount: runnerFixed,
      };
    }
  }
}

export const payoutConfigService = new PayoutConfigService();
