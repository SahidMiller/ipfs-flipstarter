module.exports = class bitcoinCashUtilities {
  
  static get SATS_PER_BCH() {
    return 100000000;
  }

  static get commitmentsPerTransaction() {
    return 650
  }

  // Define a helper function we need to calculate the floor.
  static inputPercentModifier(inputPercent, currentMinerFee, totalContractOutputValue, currentCommittedSatoshis, currentCommitmentCount) {
    const commitmentsPerTransaction = bitcoinCashUtilities.commitmentsPerTransaction

    // Calculate how many % of the total fundraiser the smallest acceptable contribution is at the moment.
    const remainingValue = currentMinerFee + (totalContractOutputValue - currentCommittedSatoshis);

    const currentTransactionSize = 42; // this.contract.assembleTransaction().byteLength;

    const minPercent = 0 + (remainingValue / (commitmentsPerTransaction - currentCommitmentCount) + 546 / bitcoinCashUtilities.SATS_PER_BCH) / remainingValue;
    const maxPercent = 1 - ((currentTransactionSize + 1650 + 49) * 1.0) / (remainingValue * bitcoinCashUtilities.SATS_PER_BCH);

    const minValue = Math.log(minPercent * 100);
    const maxValue = Math.log(maxPercent * 100);

    // Return a percentage number on a non-linear scale with higher resolution in the lower boundaries.
    return (Math.exp(minValue + (inputPercent * (maxValue - minValue)) / 100) / 100);
  }

  /**
   * Helper function that provides the dust limit standardness parameter.
   *
   * @returns the dustlimit in satoshis.
   */
  static get dustLimit() {
    return 546;
  }

  /**
   * Helper function that provides the max satoshis that is spendable.
   *
   * @returns the dustlimit in satoshis.
   */
  static get maxLimit() {
    return 2099999997690000;
  }

  static calculateMinerFee(RECIPIENT_COUNT, CONTRIBUTION_COUNT) {
    // Aim for two satoshis per byte to get a clear margin for error and priority on fullfillment.
    const TARGET_FEE_RATE = 2;

    // Define byte weights for different transaction parts.
    const TRANSACTION_METADATA_BYTES = 10;
    const AVERAGE_BYTE_PER_RECIPIENT = 69;
    const AVERAGE_BYTE_PER_CONTRIBUTION = 296;

    // Calculate the miner fee necessary to cover a fullfillment transaction with the next (+1) contribution.
    const MINER_FEE =
      (TRANSACTION_METADATA_BYTES +
        AVERAGE_BYTE_PER_RECIPIENT * RECIPIENT_COUNT +
        AVERAGE_BYTE_PER_CONTRIBUTION * (CONTRIBUTION_COUNT + 1)) *
      TARGET_FEE_RATE;

    // Return the calculated miner fee.
    return MINER_FEE;
  }
}