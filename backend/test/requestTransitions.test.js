const test = require('node:test');
const assert = require('node:assert/strict');
const {
  canApproveRequest,
  canRejectRequest,
  canRequesterReturn,
  canAdminReturn,
} = require('../src/utils/requestTransitions');

test('only Pending requests can be approved', () => {
  assert.equal(canApproveRequest('Pending'), true);
  for (const status of ['Approved', 'Rejected', 'Returned', 'Overdue', 'Unknown', null]) {
    assert.equal(canApproveRequest(status), false, `status ${status} must not be approved`);
  }
});

test('only Pending requests can be rejected', () => {
  assert.equal(canRejectRequest('Pending'), true);
  for (const status of ['Approved', 'Rejected', 'Returned', 'Overdue', 'Unknown', null]) {
    assert.equal(canRejectRequest(status), false, `status ${status} must not be rejected`);
  }
});

test('requester can submit a return only for an approved checked-out document', () => {
  assert.equal(canRequesterReturn('Approved', 'Checked-out'), true);
  for (const [requestStatus, documentStatus] of [
    ['Pending', 'Checked-out'],
    ['Rejected', 'Checked-out'],
    ['Returned', 'Returned'],
    ['Approved', 'Active'],
    ['Approved', 'Returned'],
    ['Overdue', 'Checked-out'],
  ]) {
    assert.equal(canRequesterReturn(requestStatus, documentStatus), false);
  }
});

test('admin can complete direct returns or verify requester-submitted returns only', () => {
  assert.equal(canAdminReturn('Approved', 'Checked-out'), true);
  assert.equal(canAdminReturn('Return Pending', 'Returned'), true);
  for (const [requestStatus, documentStatus] of [
    ['Pending', 'Active'],
    ['Pending', 'Checked-out'],
    ['Approved', 'Active'],
    ['Approved', 'Returned'],
    ['Rejected', 'Returned'],
    ['Returned', 'Returned'],
    ['Returned', 'Active'],
    ['Returned', 'Checked-out'],
    ['Overdue', 'Checked-out'],
  ]) {
    assert.equal(canAdminReturn(requestStatus, documentStatus), false);
  }
});
