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

  static calculateTotalRecipientMinerFees(RECIPIENT_COUNT, TARGET_FEE_RATE = 1) {
    return (
      (bitcoinCashUtilities.AVERAGE_BYTE_PER_RECIPIENT * RECIPIENT_COUNT) + 
      (bitcoinCashUtilities.TRANSACTION_METADATA_BYTES)
    ) * TARGET_FEE_RATE;
  }

  static calculateTotalContributorMinerFees(CONTRIBUTION_COUNT, TARGET_FEE_RATE = 1) {
    // Calculate the miner fee necessary to cover a fullfillment transaction for each contribution contribution.
    return (bitcoinCashUtilities.AVERAGE_BYTE_PER_CONTRIBUTION * (CONTRIBUTION_COUNT)) * TARGET_FEE_RATE;
  };

  static calculateActualFeeRate(recipientCount, requestedSatoshis, contributionCount, committedSatoshis) {
    // calculate real fee rate by:
    // 1. getting total bytes (fee rate of 1 sat per byte)
    // 2. getting actual fee in satoshis (total committed minus what was requested)
    // 3. divide actual fee sats by bytes to get sat per byte
    if (committedSatoshis < requestedSatoshis || recipientCount === 0 || contributionCount === 0) {
      return
    }

    return (committedSatoshis - requestedSatoshis) / (
      this.calculateTotalRecipientMinerFees(recipientCount, 1) +
      this.calculateTotalContributorMinerFees(contributionCount, 1)
    )
  }
}