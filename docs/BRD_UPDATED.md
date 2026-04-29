# HotelPro — Business Requirement Document (BRD) - Updated

## 1. Project Overview
HotelPro is an enterprise-grade Hotel Management Mobile Application built to handle daily operations including bookings, room management, payments, and Aadhaar compliance securely.

## 2. Updated Feature List (Aligned with Implementation)

### 2.1 Booking Management
- **Multi-room Bookings (New):** A single booking can cover multiple rooms simultaneously.
- **Quick & Manual Booking:** Staff can book instantly via an interactive calendar.
- **Conflict Prevention:** Double-booking checks prevent overlapping reservations.
- **Booking Status Flow:** `BOOKED` → `CHECKED_IN` → `COMPLETED` / `CANCELLED`.
- **Search & Filters (New):** Advanced server-side search across booking ID, customer name, mobile, and dynamic date ranges.

### 2.2 Billing & Payments
- **Payment Modes:** Support for Cash, UPI, and Card entries.
- **Extra Charges (New):** Dynamic extra charges addition during check-out with a separate database tracking mechanism.
- **Partial Payments:** Supports collection of partial payments with pending balance tracking.

### 2.3 Security & Compliance
- **Aadhaar Mandate:** Aadhaar image upload is mandatory for customer registration.
- **Secure Handling (Missing/Requires Update):** Expected implementation of encrypted file storage and authenticated endpoints for document viewing.
- **Role-Based Access:** ADMIN and STAFF isolation (e.g., Settings/Dashboard restrictions).

### 2.4 Dashboard & Reporting
- **Real-time Overview:** Live statistics on room occupancy, revenue tracking, and daily activity.
- **Pagination (Added Requirement):** All history and booking lists must load items using a defaulted 10-record pagination.
- **Revenue Exports:** Historical revenue filtering by date and distinct payment modes.

## 3. Discovered Clarifications & Edge Cases
- **Check-in Constraints:** Check-in status change is strictly enforced to only trigger on the actual check-in date.
- **Checkout Financial Wall:** Checkout cannot be completed if the total amount (including extra charges) is not fully paid.
- **Room Lifecycle:** Rooms transition safely to `CLEANING` status post checkout or cancellation if already `CHECKED_IN`.

## 4. Pending Requirements
- Implement Aadhaar field/file encryption and restricted view.
- Introduce CSV/PDF export functional routes for end-of-month reporting.
- Introduce visual pagination components on Dashboard History lists.
