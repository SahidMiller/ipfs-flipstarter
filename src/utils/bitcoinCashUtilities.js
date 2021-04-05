module.exports = class bitcoinCashUtilities {
  
  static get SATS_PER_BCH() {
    return 100000000;
  }

  /**
   * Helper function that provides the dust limit standardness parameter.
   *
   * @returns the dustlimit in satoshis.
   */
   static get MIN_SATOSHIS() {
    return 546;
  }

  /**
   * Helper function that provides the max satoshis that is spendable.
   *
   * @returns the dustlimit in satoshis.
   */
  static get MAX_SATOSHIS() {
    return 2099999997690000;
  }

  static get COMMITMENTS_PER_TRANSACTION() {
    return 650
  }

  // Aim for two satoshis per byte to get a clear margin for error and priority on fullfillment.
  static get TARGET_FEE_RATE() {
    return 2;
  }
  
  // Define byte weights for different transaction parts.
  static get AVERAGE_BYTE_PER_CONTRIBUTION() {
    return 296;
  }

  static get TRANSACTION_METADATA_BYTES() {
    return 10;
  }
  
  static get AVERAGE_BYTE_PER_RECIPIENT() {
    return 69;
  }
  
  static get CONTRIBUTOR_MINER_FEE() {

    // Calculate the miner fee necessary to cover a fullfillment transaction for each contribution contribution.
    return bitcoinCashUtilities.calculateTotalContributorMinerFees(1);  
  }

  static calculateTotalContributorMinerFees(CONTRIBUTION_COUNT) {
    // Calculate the miner fee necessary to cover a fullfillment transaction for each contribution contribution.
    return (bitcoinCashUtilities.AVERAGE_BYTE_PER_CONTRIBUTION * (CONTRIBUTION_COUNT)) * bitcoinCashUtilities.TARGET_FEE_RATE;
  };
  
  static calculateCampaignerMinerFee(RECIPIENT_COUNT) {
    // Calculate the miner fee necessary to cover a fullfillment transaction for each recipient.
    return ( 
      bitcoinCashUtilities.TRANSACTION_METADATA_BYTES + 
      bitcoinCashUtilities.AVERAGE_BYTE_PER_RECIPIENT * RECIPIENT_COUNT
    ) * bitcoinCashUtilities.TARGET_FEE_RATE;
  }
}