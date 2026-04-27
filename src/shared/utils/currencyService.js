import { CURRENCY_VALUES } from "../constants/currency.enums.js";

const API_BASE_URL =
  "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies";

// In-memory cache for exchange rates
let ratesCache = {
  rates: null,
  baseCurrency: null,
  fetchedAt: null,
};

const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

/**
 * Check if cached rates are still valid
 */
function isCacheValid(baseCurrency) {
  if (!ratesCache.rates || !ratesCache.fetchedAt) return false;
  if (ratesCache.baseCurrency !== baseCurrency) return false;

  const now = Date.now();
  return now - ratesCache.fetchedAt < CACHE_TTL_MS;
}

/**
 * Fetch exchange rates from the Currency API
 * @param {string} baseCurrency - The base currency (e.g., "USD")
 * @returns {Promise<Object>} - Rates object keyed by currency code
 */
async function fetchRatesFromAPI(baseCurrency) {
  const currencyLower = baseCurrency.toLowerCase();
  const url = `${API_BASE_URL}/${currencyLower}.json`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Currency API returned ${response.status}`);
    }

    const data = await response.json();
    // API returns { date: "2024-01-01", [currencyLower]: { usd: 1.0, eur: 0.92, ... } }
    return data[currencyLower];
  } catch (error) {
    console.error(`Failed to fetch exchange rates: ${error.message}`);
    throw error;
  }
}

/**
 * Get exchange rates for a given base currency
 * Uses 12-hour cache to minimize API calls
 * @param {string} baseCurrency - The source currency
 * @returns {Promise<Object>} - Rates object
 */
export async function getExchangeRates(baseCurrency = "USD") {
  const base = baseCurrency.toUpperCase();

  if (isCacheValid(base)) {
    return ratesCache.rates;
  }

  const rates = await fetchRatesFromAPI(base);

  // Update cache
  ratesCache = {
    rates,
    baseCurrency: base,
    fetchedAt: Date.now(),
  };

  return rates;
}

/**
 * Convert an amount from one currency to another
 * @param {number} amount - The amount to convert
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @param {Object} rates - Exchange rates object (from getExchangeRates)
 * @returns {number} - Converted amount (rounded to whole number)
 */
export function convertAmount(amount, fromCurrency, toCurrency, rates) {
  if (fromCurrency === toCurrency) {
    return Math.round(amount);
  }

  const targetRate = rates[toCurrency.toLowerCase()];
  if (!targetRate) {
    throw new Error(`Exchange rate not found for ${toCurrency}`);
  }

  return Math.round(amount * targetRate);
}

/**
 * Convert an amount to all supported currencies
 * @param {number} amount - The amount to convert
 * @param {string} sourceCurrency - The source currency code
 * @returns {Promise<Object>} - Object with all currency conversions { EGP, SAR, AED, USD, EUR }
 */
export async function convertToAllCurrencies(amount, sourceCurrency) {
  const rates = await getExchangeRates(sourceCurrency);

  const result = {};
  for (const currency of CURRENCY_VALUES) {
    result[currency] = convertAmount(amount, sourceCurrency, currency, rates);
  }

  return result;
}

/**
 * Create an empty converted amounts object (all nulls)
 * Useful for schema defaults
 */
export function createEmptyConvertedObject() {
  const result = {};
  for (const currency of CURRENCY_VALUES) {
    result[currency] = null;
  }
  return result;
}
