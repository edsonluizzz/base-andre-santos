-- Add missing indexes for performance
-- Event.date: used in filters for upcoming events, weekly reports, and cron jobs
CREATE INDEX IF NOT EXISTS "Event_date_idx" ON "Event"("date");

-- Attendance.memberId: used in portal/me and evasion insights to filter by member
CREATE INDEX IF NOT EXISTS "Attendance_memberId_idx" ON "Attendance"("memberId");

-- Offering.date: used in financial reports (DRE anual) and weekly report cron
CREATE INDEX IF NOT EXISTS "Offering_date_idx" ON "Offering"("date");
