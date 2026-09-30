// Export de la configuration de l'API
export { default as api } from './config';

// Export des services API
export { authService } from './auth.service';
export { propertyService } from './property.service';
export { userService, hostAccountService } from './user.service';
export type { KycStatus, PayoutType, PayoutAccount, NotificationPrefs, HostProfileDetail } from './user.service';
export { messageService } from './message.service';
export { reviewService } from './review.service';
export { guidesService } from './guides.service';
export { alertService } from './alert.service';
export { bookingService } from './booking.service';
export { hostService } from './host.service';
export { cohostService } from './cohost.service';
export { referralService } from './referral.service';
export { resourcesService } from './resources.service';
export { supportService } from './support.service';
export { legalService } from './legal.service';
export type {
  LegalDocument, LegalDocumentFull, ConsentRecord, TaxCertificate,
} from './legal.service';
export type {
  SupportTicket, TicketMessage, FaqItem, TicketPriority, TicketStatus,
  CreateTicketPayload, ChatAvailability,
} from './support.service';
export type {
  Article, ArticleListItem, Course, CourseStep,
  ResourceLevel, ResourceLang,
} from './resources.service';
export type { ReferralCode, ReferralStats, ReferralEntry, ReferralCredits, ReferralStatus } from './referral.service';
export type {
  CoHost, CoHostPermissions, CoHostStatus, CoHostCandidate,
  RevenueShareType, InviteCoHostPayload,
} from './cohost.service';

// Export des types (pour les types qui sont définis dans nos services)
export { Message, Conversation } from './message.service';
export { Guide, GuideCategory } from './guides.service';
export { Alert, Notification } from './alert.service';
export { Booking, Availability } from './booking.service';
export {
  HostStats, PropertyStats, RevenueData, OccupancyData,
  CalendarDay, CalendarDayStatus, CalendarBulkPatch, BlockReason,
  DashboardSummary, PendingRequest, HostListing,
  ListingCard, ListingStatus, ListingStatusPatch,
} from './host.service';
