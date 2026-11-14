const MIN_PRODUCTION_JWT_SECRET_LENGTH = 32;
const PLACEHOLDER_SECRET_PATTERN = /(?:replace_with|change_me|your_secret|example)/i;

function validateProductionEnvironment(env = process.env) {
  if (env.NODE_ENV !== 'production') {
    return;
  }

  const secret = typeof env.JWT_SECRET === 'string' ? env.JWT_SECRET.trim() : '';
  if (
    secret.length < MIN_PRODUCTION_JWT_SECRET_LENGTH
    || PLACEHOLDER_SECRET_PATTERN.test(secret)
  ) {
    throw new Error(
      'JWT_SECRET must be a unique random value of at least 32 characters in production'
    );
  }
}

module.exports = { validateProductionEnvironment };
