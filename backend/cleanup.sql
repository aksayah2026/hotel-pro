TRUNCATE TABLE
notifications,
audit_logs,
extra_charges,
payments,
booking_rooms,
bookings,
customers,
push_tokens,
rooms,
room_types,
amenities,
saas_invoices,
saas_payments,
subscriptions,
tenant_deletion_logs,
tenants
RESTART IDENTITY CASCADE;

DELETE FROM users
WHERE role != 'SUPER_ADMIN';