export type HostAccessStatus = 'new' | 'verified' | 'pending' | 'rejected' | 'unavailable';

export function getHostAccessStatus(
  profile: { is_host: boolean; kyc_status: string } | null,
  application: { status: string } | null,
): HostAccessStatus {
  if (!profile) return 'unavailable';
  if (profile.is_host && profile.kyc_status === 'VERIFIED') return 'verified';
  if (application?.status === 'PENDING') return 'pending';
  if (application?.status === 'REJECTED') return 'rejected';
  // Inconsistent approval data needs support/retry, never another submission.
  if (application?.status === 'APPROVED' || profile.is_host || profile.kyc_status === 'VERIFIED') return 'unavailable';
  if (profile.kyc_status === 'PENDING') return 'pending';
  if (profile.kyc_status === 'REJECTED') return 'rejected';
  return 'new';
}
