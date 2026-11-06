/**
 * Normalize untrusted pagination query values into safe SQL LIMIT/OFFSET inputs.
 * Defaults to page 1 and 20 rows; caps page size at 200.
 */
function normalizePagination(query = {}) {
  const parsePositiveInteger = (value, fallback) => {
    if (value === undefined || value === null || value === '') return fallback;
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
    return parsed;
  };

  const page = parsePositiveInteger(query.page, 1);
  const requestedLimit = parsePositiveInteger(query.limit, 20);
  const limit = Math.min(200, requestedLimit);
  const offset = (page - 1) * limit;

  if (!Number.isSafeInteger(offset)) {
    return { page: 1, limit, offset: 0 };
  }

  return { page, limit, offset };
}

module.exports = { normalizePagination };
