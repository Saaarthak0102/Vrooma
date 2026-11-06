-- Rescheduling was removed from the product: bookings can only be cancelled (and re-booked).
-- The bookings.rescheduled_from column is kept so historical rows stay intact.
DROP FUNCTION IF EXISTS public.reschedule_booking(UUID, UUID);
