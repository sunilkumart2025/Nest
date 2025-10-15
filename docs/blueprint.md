# **App Name**: Nestify

## Core Features:

- Admin Authentication: Secure signup/login for hostel owners with Master Access Key verification and Hostel ID creation using Firebase Authentication.
- Tenure Authentication: Secure signup/login for room holders using email and Registration Number verification with Firebase Authentication.
- Dashboard Overview: Personalized admin dashboard displaying total tenures, room occupancy, monthly earnings, pending payments, and notifications.
- Tenure Management: List tenures with details (room, email, payment status), pre-register tenures, edit/remove members, and view room occupancy.
- Room Management: Add new rooms, mark as occupied/available, assign members, and set rent amounts. Storing each room in Firestore with a Hostel ID and Room ID.
- Billing and Payments (Admin View): Create/track billing, update payment status, track pending dues/transactions/income, payments made appear automatically. Each transaction linked to Hostel ID, Tenure ID, and Razorpay Payment ID.
- Payments (Tenure View): Tenures can view rent/electricity bills, pay via Razorpay, download receipts, and track payment records. Payments route directly to admin's Razorpay account and transaction details are logged in Firestore.

## Style Guidelines:

- Primary color: Deep blue (#304FFE) to convey security and professionalism, inspired by the need to establish trust.
- Background color: Light blue-gray (#E9ECF8), a desaturated shade of the primary that creates a clean backdrop.
- Accent color: Violet (#7B1FA2), for interactive elements, providing good contrast without overwhelming the user.
- Headline font: 'Space Grotesk', sans-serif for headlines. Body font: 'Inter', sans-serif for body, ensuring readability.
- Simple, clear icons to represent hostel features (rooms, payments, users).
- Clean and structured layout with clear separation between admin and tenure modules.
- Subtle animations (e.g., transitions, loading states) to enhance user experience.