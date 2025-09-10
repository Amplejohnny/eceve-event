# Organizer Dashboard

A comprehensive dashboard for event organizers to manage their events, track earnings, and handle withdrawals.

## Features

### 🏦 Financial Management Panel

#### Earnings Overview Cards

- **Total Earnings**: Shows 93% of all ticket sales revenue
- **Available Balance**: Total earnings minus pending withdrawals
- **Pending Withdrawals**: Amount currently being processed
- **Recent Earnings**: Earnings from the last 30 days

#### Monthly Earnings Chart

- Visual representation of earnings over the last 6 months
- Interactive chart showing trends and patterns
- Currency formatting in Nigerian Naira (₦)

#### Withdrawal Request System

- **Smart Bank Details Form**: Pre-fills from previous successful withdrawals
- **Amount Validation**: Maximum available balance checking
- **Progress Tracking**: Visual stepper showing request flow
- **Bank Account Verification**: Real-time validation using Paystack API

#### Withdrawal History Table

- Complete history of all withdrawal requests
- Status tracking (Pending, Processing, Completed, Failed)
- Bank account details (masked for security)
- Paystack reference numbers for tracking

### 📊 Event Analytics Section

#### Ticket Sales Overview

- **Total Attendees**: Unique attendees across all events
- **Tickets Sold**: Total number of tickets purchased
- **Total Revenue**: Gross revenue from ticket sales

#### Attendee Management

- **Comprehensive Table**: All ticket purchasers with details
- **Search & Filter**: By name, email, confirmation ID, status
- **Export Functionality**: Download attendee lists as CSV
- **Real-time Updates**: Live ticket sales counter

#### Export Features

- CSV export with customizable options
- Include/exclude phone numbers and payment references
- Filter by status and ticket type
- Sort by various criteria

## API Endpoints

### Financial Management

- `GET /api/organizer/earnings` - Calculate total earnings and balance
- `GET /api/organizer/withdrawals` - Get withdrawal history
- `POST /api/organizer/withdraw` - Create withdrawal request
- `GET /api/organizer/banks` - Get Nigerian banks list
- `POST /api/organizer/verify-bank` - Verify bank account details

### Event Analytics

- `GET /api/organizer/attendees` - List all ticket purchasers
- `GET /api/organizer/attendees/export` - Export attendees as CSV

## Technical Implementation

### Security Features

- **Role-based Access Control**: Only organizers can access
- **Encrypted Bank Details**: Sensitive data encrypted at rest
- **Rate Limiting**: Protection against abuse
- **Input Validation**: Comprehensive form validation

### Payment Integration

- **Paystack Transfer API**: Automated organizer payouts needing Admin approval
- **Bank Account Verification**: Real-time validation
- **Webhook Processing**: Payment status updates
- **Fallback System**: Manual processing when needed

### Database Schema

- **Payout Model**: Tracks withdrawal requests and status
- **Payment Model**: Stores transaction details with organizer share
- **Ticket Model**: Links to payments and events
- **User Model**: Role-based permissions

### UI/UX Features

- **Mobile Responsive**: Works on all device sizes
- **Real-time Updates**: Live data refresh
- **Loading States**: Smooth user experience
- **Error Handling**: Clear error messages
- **Accessibility**: WCAG compliant components

## Usage

### Accessing the Dashboard

1. Login as an organizer
2. Click on your profile avatar
3. Select "Dashboard" from the dropdown menu
4. Navigate to `/dashboard/organizer`

### Requesting a Withdrawal

1. Click "Request Withdrawal" button
2. Enter bank account details
3. Verify account information
4. Submit request
5. Track status in withdrawal history

### Exporting Attendees

1. Go to Event Analytics section
2. Apply any desired filters
3. Click "Export CSV" button
4. Download the generated file

## Environment Variables

Make sure these are set in your `.env` file:

```
PAYSTACK_SECRET_KEY=your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=your_paystack_public_key
```

## Dependencies

- **Next.js 14**: React framework
- **Prisma**: Database ORM
- **NextAuth.js**: Authentication
- **Tailwind CSS**: Styling
- **Heroicons**: Icons
- **React Hot Toast**: Notifications

## Future Enhancements

- [ ] Advanced analytics with charts and graphs
- [ ] Email notifications for withdrawal status
- [ ] Bulk withdrawal requests
- [ ] Tax reporting features
- [ ] Integration with accounting software
- [ ] Mobile app for dashboard access
