// Build pagination info from query params
export function buildPagination({ page, limit }, defaultLimit = 10) {
  const pageNum = Math.max(Number(page) || 1, 1);
  const limitNum = Math.max(Number(limit) || defaultLimit, 1);
  const skip = (pageNum - 1) * limitNum;
  return { pageNum, limitNum, skip };
}

// Build sort object from query params
export function buildSort({ sort }, defaultSort = "-createdAt") {
  const sortValue = sort || defaultSort;

  if (!sortValue) return undefined;

  const sortFields = String(sortValue)
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean);

  if (!sortFields.length) return undefined;

  const sortObj = {};
  for (const field of sortFields) {
    if (field.startsWith("-")) {
      sortObj[field.substring(1)] = -1;
    } else {
      sortObj[field] = 1;
    }
  }

  return sortObj;
}

// Build a generic regex-based filter from query params.
export function buildRegexFilter(query, excludeKeys = []) {
  const filter = {};
  const excluded = new Set([...excludeKeys, "lang"]);

  Object.keys(query).forEach((key) => {
    if (excluded.has(key)) return;

    const value = query[key];

    if (typeof value === "string") {
      const lowerValue = value.toLowerCase();
      if (lowerValue === "true") {
        filter[key] = true;
      } else if (lowerValue === "false") {
        filter[key] = false;
      } else {
        filter[key] = { $regex: value, $options: "i" };
      }
    } else {
      filter[key] = value;
    }
  });

  return filter;
}

/**
 * Normalize a value to match an enum (case-insensitive).
 * @param {string} value - The input value from query/body
 * @param {Object} enumObj - The enum object (e.g., PROJECT_STATUS)
 * @returns {string|null} - The normalized enum value or null if not found
 */
export function normalizeEnum(value, enumObj) {
  if (!value || typeof value !== "string") return null;

  const lowerValue = value.toLowerCase().trim();
  const enumValues = Object.values(enumObj);

  // Find matching enum value (case-insensitive)
  const match = enumValues.find((v) => v.toLowerCase() === lowerValue);
  return match || null;
}

/**
 * Normalize multiple enum values from a comma-separated string or array.
 * @param {string|string[]} values - The input values
 * @param {Object} enumObj - The enum object
 * @returns {string[]} - Array of normalized enum values
 */
export function normalizeEnumArray(values, enumObj) {
  if (!values) return [];

  const arr = Array.isArray(values) ? values : String(values).split(",");

  return arr.map((v) => normalizeEnum(v, enumObj)).filter(Boolean);
}
