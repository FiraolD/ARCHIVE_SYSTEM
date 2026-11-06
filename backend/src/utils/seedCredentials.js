'use strict';

const MIN_SEED_PASSWORD_LENGTH = 16;

/**
 * Return an explicitly configured seed password or fail closed.
 * @param {string} envName Environment variable name.
 * @param {NodeJS.ProcessEnv} env Environment map, injectable for tests.
 * @returns {string}
 */
function getRequiredSeedPassword(envName, env = process.env) {
  const password = env[envName];
  if (typeof password !== 'string' || password.length < MIN_SEED_PASSWORD_LENGTH) {
    throw new Error(
      `Cannot seed account: set ${envName} to a unique password of at least ${MIN_SEED_PASSWORD_LENGTH} characters.`
    );
  }
  return password;
}

module.exports = { getRequiredSeedPassword, MIN_SEED_PASSWORD_LENGTH };
