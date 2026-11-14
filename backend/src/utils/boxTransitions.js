// src/utils/boxTransitions.js

/**
 * Box lifecycle state machine.
 *
 * Each entry defines what transitions are LEGAL from the current status,
 * and which roles are allowed to trigger each one.
 */

const ALLOWED_TRANSITIONS = {
  'Draft': [
    { to: 'Packed', roles: ['Admin', 'File Clerk'] },
  ],
  'Packed': [
    { to: 'In Transit', roles: ['Admin', 'File Clerk'] },
    { to: 'Draft',      roles: ['Admin'] },              // reopen
  ],
  'In Transit': [
    { to: 'Archived',   roles: ['Admin', 'File Clerk'] },
    { to: 'Packed',     roles: ['Admin'] },              // recall
  ],
  'Archived': [
    { to: 'Dissolved',  roles: ['Admin'] },
    { to: 'In Transit', roles: ['Admin'] },              // send back
  ],
  'Dissolved': [], // terminal state
};

/**
 * Get the list of target statuses a specific role can move to
 * from the given current status.
 */
function allowedFor(currentStatus, role) {
  return (ALLOWED_TRANSITIONS[currentStatus] || [])
    .filter(t => t.roles.includes(role))
    .map(t => t.to);
}

module.exports = { ALLOWED_TRANSITIONS, allowedFor };