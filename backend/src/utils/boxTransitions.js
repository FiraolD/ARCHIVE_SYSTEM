const ALLOWED_TRANSITIONS = {
  Draft: [{ to: 'Packed', roles: ['Admin', 'Manager'] }],
  Packed: [
    { to: 'In Transit', roles: ['Admin', 'Manager'] },
    { to: 'Draft', roles: ['Admin'] },
  ],
  'In Transit': [
    { to: 'Archived', roles: ['Admin', 'Manager'] },
    { to: 'Packed', roles: ['Admin'] },
  ],
  Archived: [
    { to: 'Dissolved', roles: ['Admin'] },
    { to: 'In Transit', roles: ['Admin'] },
  ],
  Dissolved: [],
};

function allowedFor(currentStatus, role) {
  return (ALLOWED_TRANSITIONS[currentStatus] || [])
    .filter((transition) => transition.roles.includes(role))
    .map((transition) => transition.to);
}

module.exports = { ALLOWED_TRANSITIONS, allowedFor };
