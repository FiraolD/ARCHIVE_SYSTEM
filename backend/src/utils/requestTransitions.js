/**
 * Pure guards for file-request workflow transitions.
 *
 * These rules complement database row locks and conditional updates; they do
 * not replace transactional/concurrency tests against PostgreSQL.
 */
function canApproveRequest(requestStatus) {
  return requestStatus === 'Pending';
}

function canRejectRequest(requestStatus) {
  return requestStatus === 'Pending';
}

function canRequesterReturn(requestStatus, documentStatus) {
  return requestStatus === 'Approved' && documentStatus === 'Checked-out';
}

function canAdminReturn(requestStatus, documentStatus) {
  return (
    (requestStatus === 'Approved' && documentStatus === 'Checked-out') ||
    (requestStatus === 'Returned' && documentStatus === 'Returned')
  );
}

module.exports = {
  canApproveRequest,
  canRejectRequest,
  canRequesterReturn,
  canAdminReturn,
};
