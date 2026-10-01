import { expect, it } from 'vitest';
import { getHostAccessStatus } from '../src/utils/hostAccess';

it('opens a verified host workspace after local onboarding state was reset', () => {
  expect(getHostAccessStatus({ is_host: true, kyc_status: 'VERIFIED' }, null)).toBe('verified');
});
it('keeps pending applications out of a new submission flow', () => {
  expect(getHostAccessStatus({ is_host: false, kyc_status: 'PENDING' }, { status: 'PENDING' })).toBe('pending');
});
it('permits correction for a rejected application', () => {
  expect(getHostAccessStatus({ is_host: false, kyc_status: 'REJECTED' }, { status: 'REJECTED' })).toBe('rejected');
});
it('does not treat missing or inconsistent approval data as a new application', () => {
  expect(getHostAccessStatus(null, null)).toBe('unavailable');
  expect(getHostAccessStatus({ is_host: false, kyc_status: 'NOT_VERIFIED' }, { status: 'APPROVED' })).toBe('unavailable');
});
it('allows a first application when neither source reports one', () => {
  expect(getHostAccessStatus({ is_host: false, kyc_status: 'NOT_VERIFIED' }, null)).toBe('new');
});
