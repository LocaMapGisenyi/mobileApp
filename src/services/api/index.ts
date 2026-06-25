// Export de la configuration de l'API
export { default as api } from './config';

// Export des services API
export { authService } from './auth.service';
export { propertyService } from './property.service';
export { userService } from './user.service';
export { messageService } from './message.service';
export { reviewService } from './review.service';
export { guidesService } from './guides.service';
export { alertService } from './alert.service';
export { bookingService } from './booking.service';
export { hostService } from './host.service';

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