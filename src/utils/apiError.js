 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }






/** Safely extracts common fields from Axios-style errors without trusting the payload shape. */
export const getApiErrorDetails = (value) => {
  if (typeof value !== 'object' || value === null) return {};

  const candidate = value ;
  const response = typeof candidate.response === 'object' && candidate.response !== null
    ? candidate.response 
    : undefined;
  const rawData = response && typeof response.data === 'object' && response.data !== null
    ? response.data 
    : undefined;
  const error = typeof _optionalChain([rawData, 'optionalAccess', _ => _.error]) === 'string' ? rawData.error : undefined;
  const responseMessage = typeof _optionalChain([rawData, 'optionalAccess', _2 => _2.message]) === 'string' ? rawData.message : undefined;
  const message = typeof candidate.message === 'string' ? candidate.message : undefined;
  const status = typeof _optionalChain([response, 'optionalAccess', _3 => _3.status]) === 'number' ? response.status : undefined;

  return {
    status,
    error,
    message: _nullishCoalesce(_nullishCoalesce(error, () => ( responseMessage)), () => ( message)),
    data: rawData,
  };
};
