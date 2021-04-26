//TODO God willing: replace with IPNS or configurable, God willing.
export async function loadCurrencyRates() {
    try {
      // request the currency rates.
      const currencyRatesResponse = fetch("https://bitpay.com/api/rates/BCH");

      // Store the current rates.
      return await (await currencyRatesResponse).json();
    
    } catch (error) {
      // request the currency rates.
      const currencyRatesResponse = fetch("https://markets.api.bitcoin.com/rates?c=BCH");

      // Store the current rates.
      return await (await currencyRatesResponse).json();
    }
}