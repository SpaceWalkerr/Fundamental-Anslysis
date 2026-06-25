# 💳 Payment System Documentation

Complete technical documentation for the Stripe-powered payment and subscription system.

## 📑 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Feature Gating](#feature-gating)
6. [Webhook Handling](#webhook-handling)
7. [Frontend Components](#frontend-components)
8. [Usage Limiting](#usage-limiting)
9. [Subscription Plans](#subscription-plans)
10. [Security](#security)
11. [Testing](#testing)
12. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

### What It Does

The payment system enables monetization through subscription-based access control:

- **Two Tiers:** Free and Premium plans
- **Stripe Integration:** Industry-standard payment processing
- **Feature Gating:** Control access to premium features
- **Usage Limits:** Rate limiting based on subscription tier
- **Self-Service:** Users manage their own subscriptions
- **Webhooks:** Automatic synchronization with Stripe

### Key Features

✅ Secure payment processing via Stripe  
✅ Monthly and yearly billing options  
✅ Feature-level access control  
✅ Usage tracking and limiting  
✅ Customer portal for subscription management  
✅ Webhook-driven subscription updates  
✅ Payment history tracking  
✅ Automatic subscription renewal  
✅ Grace period for failed payments

---

## 🏗️ Architecture

### System Components

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   Frontend  │────────▶│   Backend    │────────▶│   Supabase   │
│   (React)   │         │   (FastAPI)  │         │  (Postgres)  │
└─────────────┘         └──────────────┘         └──────────────┘
       │                        │                         │
       │                        │                         │
       │                ┌───────▼──────────┐             │
       └───────────────▶│     Stripe       │             │
                        │  (Payments API)  │             │
                        └──────────────────┘             │
                                 │                        │
                                 │ Webhooks               │
                                 └───────────────────────▶│
```

### Data Flow

1. **Subscription Purchase:**
   - User clicks "Upgrade" → Frontend calls `/subscription/checkout`
   - Backend creates Stripe checkout session
   - User redirected to Stripe-hosted checkout
   - Payment processed by Stripe
   - Stripe sends webhook to backend
   - Backend updates subscription in database
   - User redirected back with success status

2. **Feature Access Check:**
   - User requests premium feature
   - Backend checks subscription via dependency
   - If access granted → proceed
   - If access denied → return 403 with upgrade prompt

3. **Usage Limiting:**
   - User performs action (e.g., screening)
   - Backend checks daily usage vs. plan limits
   - If under limit → increment counter and proceed
   - If at/over limit → return 429 with upgrade prompt

---

## 🗄️ Database Schema

### Tables

#### `subscription_plans`

Defines available subscription tiers.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Unique plan identifier ('free', 'premium') |
| display_name | TEXT | User-facing name |
| description | TEXT | Plan description |
| price_monthly | DECIMAL | Monthly price in dollars |
| price_yearly | DECIMAL | Yearly price in dollars |
| stripe_product_id | TEXT | Stripe product ID |
| stripe_price_id_monthly | TEXT | Stripe price ID for monthly billing |
| stripe_price_id_yearly | TEXT | Stripe price ID for yearly billing |
| features | JSONB | Array of feature descriptions |
| max_watchlist_stocks | INT | Max stocks in watchlist (-1 = unlimited) |
| max_alerts | INT | Max price alerts (-1 = unlimited) |
| max_screening_runs_per_day | INT | Daily screening limit |
| max_analysis_runs_per_day | INT | Daily analysis limit |
| max_chat_messages_per_day | INT | Daily chat limit |
| enable_technical_indicators | BOOLEAN | Access to technical indicators |
| enable_realtime_data | BOOLEAN | Access to real-time data |
| enable_advanced_screening | BOOLEAN | Access to advanced screening |
| enable_pdf_export | BOOLEAN | Access to PDF export |
| enable_email_alerts | BOOLEAN | Access to email alerts |
| enable_priority_support | BOOLEAN | Access to priority support |

#### `subscriptions`

Tracks user subscriptions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to auth.users (unique) |
| plan_id | UUID | Foreign key to subscription_plans |
| stripe_customer_id | TEXT | Stripe customer ID |
| stripe_subscription_id | TEXT | Stripe subscription ID |
| stripe_checkout_session_id | TEXT | Stripe checkout session ID |
| status | ENUM | Subscription status (active, canceled, etc.) |
| current_period_start | TIMESTAMPTZ | Billing period start |
| current_period_end | TIMESTAMPTZ | Billing period end |
| cancel_at_period_end | BOOLEAN | Whether subscription cancels at period end |
| canceled_at | TIMESTAMPTZ | Cancellation timestamp |
| billing_cycle | TEXT | 'monthly' or 'yearly' |
| amount | DECIMAL | Amount charged per cycle |

#### `payment_history`

Transaction log for all payments.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to auth.users |
| subscription_id | UUID | Foreign key to subscriptions |
| stripe_payment_intent_id | TEXT | Stripe payment intent ID |
| stripe_charge_id | TEXT | Stripe charge ID |
| stripe_invoice_id | TEXT | Stripe invoice ID |
| amount | DECIMAL | Payment amount |
| currency | TEXT | Currency code (default 'usd') |
| status | ENUM | Payment status (succeeded, pending, failed) |
| payment_method | TEXT | Payment method type |
| failure_message | TEXT | Error message if failed |

#### `feature_usage`

Tracks daily feature usage for rate limiting.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to auth.users |
| usage_date | DATE | Usage date (unique with user_id) |
| screening_runs | INT | Number of screening runs today |
| analysis_runs | INT | Number of analysis runs today |
| chat_messages | INT | Number of chat messages today |
| alerts_created | INT | Number of alerts created today |
| pdf_exports | INT | Number of PDF exports today |

#### `stripe_webhook_events`

Logs all Stripe webhook events for debugging.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| stripe_event_id | TEXT | Stripe event ID (unique) |
| event_type | TEXT | Event type (e.g., 'invoice.paid') |
| payload | JSONB | Full event payload |
| processed | BOOLEAN | Whether event was processed successfully |
| processing_error | TEXT | Error message if processing failed |
| created_at | TIMESTAMPTZ | Event timestamp |
| processed_at | TIMESTAMPTZ | Processing timestamp |

### Database Functions

#### `get_user_subscription(p_user_id UUID)`

Returns complete subscription info including plan features and limits.

**Returns:** Table with subscription_id, plan_name, plan_type, status, features, limits

#### `has_feature_access(p_user_id UUID, p_feature_name TEXT)`

Checks if user has access to a specific feature.

**Returns:** BOOLEAN

#### `check_usage_limit(p_user_id UUID, p_limit_type TEXT)`

Checks if user has remaining quota for a feature.

**Returns:** JSONB with {allowed, limit, used, remaining}

#### `increment_usage(p_user_id UUID, p_usage_type TEXT)`

Increments usage counter for rate limiting.

**Returns:** VOID

---

## 🔌 API Endpoints

### Public Endpoints

#### `GET /api/subscription-plans`

Get all available subscription plans.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "free",
    "display_name": "Free Plan",
    "description": "Perfect for getting started",
    "price_monthly": 0.00,
    "price_yearly": null,
    "features": ["Basic analysis", "10 stocks", "..."],
    "plan_type": "free",
    "limits": {
      "max_watchlist_stocks": 10,
      "max_alerts": 5,
      "enable_technical_indicators": false,
      ...
    }
  },
  {
    "id": "uuid",
    "name": "premium",
    "display_name": "Premium Plan",
    "price_monthly": 29.00,
    "price_yearly": 290.00,
    ...
  }
]
```

#### `GET /api/subscription/health`

Health check for payment system.

**Response:**
```json
{
  "status": "healthy",
  "stripe_configured": true,
  "webhook_configured": true,
  "stripe_version": "2023-10-16"
}
```

#### `POST /api/webhooks/stripe`

Stripe webhook endpoint (verified by signature).

**Headers:**
- `stripe-signature`: Webhook signature for verification

**Handled Events:**
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

### Protected Endpoints (Require Authentication)

#### `GET /api/subscription/status`

Get current user's subscription status.

**Response:**
```json
{
  "subscription_id": "uuid",
  "plan_name": "premium",
  "plan_type": "premium",
  "status": "active",
  "current_period_end": "2026-03-20T00:00:00Z",
  "cancel_at_period_end": false,
  "features": ["..."],
  "limits": {
    "max_watchlist_stocks": -1,
    "enable_technical_indicators": true,
    ...
  }
}
```

#### `POST /api/subscription/checkout`

Create Stripe checkout session for subscription purchase.

**Request:**
```json
{
  "plan_name": "premium",
  "billing_cycle": "monthly",
  "success_url": "https://yourapp.com/success",
  "cancel_url": "https://yourapp.com/cancel"
}
```

**Response:**
```json
{
  "session_id": "cs_test_...",
  "url": "https://checkout.stripe.com/...",
  "customer_id": "cus_..."
}
```

#### `POST /api/subscription/portal`

Create Stripe Customer Portal session for subscription management.

**Request:**
```json
{
  "return_url": "https://yourapp.com/settings"
}
```

**Response:**
```json
{
  "url": "https://billing.stripe.com/..."
}
```

#### `POST /api/subscription/cancel`

Cancel user's subscription.

**Request:**
```json
{
  "immediately": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription canceled at period end",
  "details": {
    "subscription_id": "sub_...",
    "status": "active",
    "cancel_at_period_end": true,
    "current_period_end": 1234567890
  }
}
```

#### `POST /api/subscription/check-feature`

Check if user has access to a specific feature.

**Request:**
```json
{
  "feature_name": "technical_indicators"
}
```

**Response:**
```json
{
  "has_access": true,
  "feature_name": "technical_indicators"
}
```

#### `GET /api/subscription/usage/{limit_type}`

Check user's usage against plan limits.

**Parameters:**
- `limit_type`: screening_runs | analysis_runs | chat_messages | alerts

**Response:**
```json
{
  "allowed": true,
  "limit": 100,
  "used": 45,
  "remaining": 55
}
```

#### `GET /api/subscription/payment-history`

Get user's payment history.

**Query Parameters:**
- `limit`: Number of records (default: 10)

**Response:**
```json
[
  {
    "id": "uuid",
    "amount": 29.00,
    "currency": "usd",
    "status": "succeeded",
    "payment_method": "card",
    "description": "Subscription payment - Premium Plan",
    "created_at": "2026-02-20T12:00:00Z"
  },
  ...
]
```

---

## 🔒 Feature Gating

### Backend Dependencies

Use these dependencies in your FastAPI endpoints to protect premium features.

#### Basic Usage

```python
from app.utils.feature_gates import require_premium

@router.get("/premium-endpoint")
async def premium_feature(user: dict = Depends(require_premium)):
    # User is guaranteed to have premium subscription
    return {"data": "premium content"}
```

#### Specific Feature Check

```python
from app.utils.feature_gates import require_technical_indicators

@router.get("/stocks/{ticker}/technicals")
async def get_technicals(
    ticker: str,
    user: dict = Depends(require_technical_indicators)
):
    # User has access to technical indicators
    return calculate_indicators(ticker)
```

#### Available Dependencies

- `require_premium` - Requires any premium plan
- `require_technical_indicators` - Requires technical indicators feature
- `require_realtime_data` - Requires real-time data feature
- `require_advanced_screening` - Requires advanced screening feature
- `require_pdf_export` - Requires PDF export feature
- `require_email_alerts` - Requires email alerts feature

#### Usage Limiting

```python
from app.utils.feature_gates import check_screening_limit

@router.post("/stocks/screen")
async def screen_stocks(
    filters: dict,
    user: dict = Depends(check_screening_limit)
):
    # Usage automatically checked and incremented
    # Raises 429 if limit exceeded
    # user["usage"] contains current usage info
    return perform_screening(filters)
```

#### Available Usage Checkers

- `check_screening_limit` - Checks and increments screening runs
- `check_analysis_limit` - Checks and increments analysis runs
- `check_chat_limit` - Checks and increments chat messages
- `check_pdf_limit` - Checks and increments PDF exports

### Error Responses

**403 Forbidden** - No feature access:
```json
{
  "detail": "This feature (technical_indicators) requires a Premium subscription. Upgrade your plan to access it."
}
```

**429 Too Many Requests** - Usage limit exceeded:
```json
{
  "detail": "Daily limit reached for screening_runs. You've used 5 out of 5 allowed today. Upgrade to Premium for unlimited access."
}
```

---

## 🎨 Frontend Components

### Pricing Page

Full-featured pricing page with plan comparison.

```tsx
import Pricing from '@/pages/Pricing';

// Auto-detects current subscription
// Handles checkout flow
// Shows billing cycle toggle
// Displays savings on yearly plans
```

**Features:**
- Plan comparison cards
- Monthly/yearly toggle with savings display
- Current plan indicator
- One-click checkout
- Redirect handling for success/cancel
- Responsive design

### Subscription Management

Comprehensive subscription management component.

```tsx
import SubscriptionManagement from '@/components/SubscriptionManagement';

function SettingsPage() {
  return <SubscriptionManagement />;
}
```

**Features:**
- Current plan display
- Subscription status badge
- Renewal/cancellation date
- Feature list
- Usage statistics with progress bars
- Manage billing button (opens Stripe portal)
- Cancel subscription button
- Upgrade prompt for free users

### Premium Feature Lock

Flexible component for gating premium features.

```tsx
import { PremiumFeatureLock } from '@/components/PremiumFeatureLock';

// Card variant - Shows upgrade card
<PremiumFeatureLock 
  featureName="technical_indicators"
  title="Technical Indicators"
  description="Upgrade to access RSI, MACD, and more"
  variant="card"
>
  <TechnicalIndicators ticker="AAPL" />
</PremiumFeatureLock>

// Overlay variant - Blurs content with overlay
<PremiumFeatureLock 
  featureName="realtime_data"
  variant="overlay"
>
  <RealTimeChart ticker="AAPL" />
</PremiumFeatureLock>

// Inline variant - Minimal lock indicator
<PremiumFeatureLock 
  featureName="pdf_export"
  title="PDF Export"
  variant="inline"
/>
```

### Premium Badge

Simple badge for indicating premium features.

```tsx
import { PremiumBadgeIndicator } from '@/components/PremiumFeatureLock';

<div className="flex items-center gap-2">
  <h3>Advanced Screening</h3>
  <PremiumBadgeIndicator />
</div>
```

### Usage Limit Warning

Shows warning when approaching usage limits.

```tsx
import { UsageLimitWarning } from '@/components/PremiumFeatureLock';

<UsageLimitWarning 
  limitType="screening_runs"
  onUpgrade={() => navigate('/pricing')}
/>
```

---

## 📊 Subscription Plans

### Free Plan

**Price:** $0/month

**Limits:**
- 10 stocks in watchlist
- 5 screening runs per day
- 10 analysis runs per day
- 20 chat messages per day
- 5 price alerts

**Features:**
- Basic stock analysis
- Community support

**Disabled Features:**
- ❌ Technical indicators
- ❌ Real-time market data
- ❌ Advanced screening
- ❌ PDF export
- ❌ Email alerts
- ❌ Priority support

### Premium Plan

**Price:** $29/month or $290/year (save 17%)

**Limits:**
- Unlimited everything (-1 = unlimited)

**Features:**
- Everything in Free
- Technical indicators (RSI, MACD, Bollinger Bands, etc.)
- Real-time market data & alerts
- Advanced screening filters
- Unlimited analysis & screening
- PDF export of reports
- Email notifications
- Priority support

---

## 🔐 Security

### Payment Security

- **PCI Compliance:** Stripe handles all payment data (PCI DSS Level 1)
- **No Card Storage:** We never store card numbers
- **Encrypted Transit:** All API calls over HTTPS
- **Webhook Verification:** Signatures verified before processing

### API Security

- **Authentication:** JWT tokens required for all protected endpoints
- **Row Level Security:** Supabase RLS policies ensure users only see their own data
- **Rate Limiting:** Built-in usage limiting prevents abuse
- **Webhook Secrets:** Validates webhook authenticity

### Data Protection

- **User Privacy:** Stripe customer IDs stored, not payment details
- **Audit Trail:** All webhooks and payments logged
- **Secure Storage:** Supabase PostgreSQL with encryption at rest

---

## 🧪 Testing

### Test Cards

Use these Stripe test cards in test mode:

| Card Number | Description |
|-------------|-------------|
| 4242 4242 4242 4242 | Successful payment |
| 4000 0000 0000 0002 | Card declined |
| 4000 0025 0000 3155 | 3D Secure authentication required |
| 4000 0000 0000 9995 | Insufficient funds |

**Expiry:** Any future date  
**CVC:** Any 3 digits  
**ZIP:** Any ZIP code

### Testing Webhooks Locally

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:8000/api/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger invoice.payment_succeeded
stripe trigger customer.subscription.updated
```

### Testing Feature Gates

```python
# Test protected endpoint
import pytest
from fastapi.testclient import TestClient

def test_premium_feature_requires_subscription(client: TestClient):
    # Free user trying to access premium feature
    response = client.get(
        "/api/stocks/AAPL/technicals",
        headers={"Authorization": f"Bearer {free_user_token}"}
    )
    assert response.status_code == 403
    assert "Premium subscription" in response.json()["detail"]

def test_premium_user_can_access(client: TestClient):
    # Premium user accessing premium feature
    response = client.get(
        "/api/stocks/AAPL/technicals",
        headers={"Authorization": f"Bearer {premium_user_token}"}
    )
    assert response.status_code == 200
```

---

## 🐛 Troubleshooting

### Common Issues

#### Issue: "No Stripe price ID configured for premium (monthly)"

**Cause:** Subscription plan missing Stripe price IDs  
**Solution:**
```sql
UPDATE subscription_plans 
SET 
  stripe_product_id = 'prod_YOUR_PRODUCT_ID',
  stripe_price_id_monthly = 'price_YOUR_MONTHLY_ID',
  stripe_price_id_yearly = 'price_YOUR_YEARLY_ID'
WHERE name = 'premium';
```

#### Issue: Webhook signature verification failed

**Cause:** Wrong webhook secret  
**Solution:** Verify webhook secret in `.env` matches Stripe dashboard

#### Issue: User has subscription but getting 403

**Cause:** Subscription status not 'active'  
**Solution:** Check subscription status:
```sql
SELECT status, plan_type FROM subscriptions WHERE user_id = 'UUID';
```

#### Issue: Usage limits not enforcing

**Cause:** Feature usage not being tracked  
**Solution:** Ensure you're using the usage checker dependencies:
```python
from app.utils.feature_gates import check_screening_limit
```

### Debugging

#### View Webhook Logs

```sql
SELECT 
  event_type, 
  processed, 
  processing_error,
  created_at 
FROM stripe_webhook_events 
ORDER BY created_at DESC 
LIMIT 20;
```

#### Check User's Subscription

```sql
SELECT * FROM get_user_subscription('USER_UUID');
```

#### View Payment History

```sql
SELECT 
  amount,
  status,
  description,
  created_at 
FROM payment_history 
WHERE user_id = 'USER_UUID'
ORDER BY created_at DESC;
```

---

## 📈 Monitoring

### Key Metrics to Track

1. **Conversion Rate:** Free → Premium upgrades
2. **Churn Rate:** Subscription cancellations
3. **MRR:** Monthly Recurring Revenue
4. **Feature Usage:** Which features drive upgrades
5. **Payment Success Rate:** Failed vs. successful payments

### Queries for Analytics

```sql
-- Active subscriptions by plan
SELECT 
  sp.display_name,
  COUNT(*) as count,
  SUM(s.amount) as monthly_revenue
FROM subscriptions s
JOIN subscription_plans sp ON s.plan_id = sp.id
WHERE s.status = 'active'
GROUP BY sp.display_name;

-- New subscriptions this month
SELECT COUNT(*) 
FROM subscriptions 
WHERE status = 'active'
AND created_at >= date_trunc('month', NOW());

-- Churned subscriptions this month
SELECT COUNT(*)
FROM subscriptions
WHERE status = 'canceled'
AND canceled_at >= date_trunc('month', NOW());
```

---

## 🎓 Best Practices

1. **Start with Test Mode:** Thoroughly test before going live
2. **Monitor Webhooks:** Check webhook logs regularly
3. **Handle Failures Gracefully:** Show clear error messages
4. **Provide Clear Pricing:** No hidden fees or surprises
5. **Easy Cancellation:** Make it easy to cancel (builds trust)
6. **Email Confirmations:** Send confirmation emails (via Stripe)
7. **Grace Period:** Allow time for failed payments before downgrading
8. **Feature Previews:** Let free users preview premium features
9. **Analytics:** Track conversion funnel to optimize pricing
10. **Customer Support:** Respond quickly to payment issues

---

## 🚀 Future Enhancements

- [ ] **Free Trial:** 14-day free trial for Premium
- [ ] **Promotional Codes:** Discount codes for marketing campaigns
- [ ] **Team Plans:** Multi-user subscriptions
- [ ] **Usage-Based Pricing:** Pay per API call
- [ ] **Add-ons:** Individual feature purchases
- [ ] **Gifting:** Gift subscriptions to others
- [ ] **Referral Program:** Earn credits for referrals
- [ ] **Annual Discounts:** Higher discounts for yearly plans
- [ ] **Enterprise Plan:** Custom pricing for large organizations

---

## 📞 Support

**Stripe Documentation:** https://stripe.com/docs  
**Stripe Support:** https://support.stripe.com  
**Test Mode Dashboard:** https://dashboard.stripe.com/test  
**Webhook Tester:** Use Stripe CLI for local testing

---

## ⚠️ Legal Disclaimer

This payment system is provided as-is. Ensure compliance with:

- Payment Card Industry Data Security Standard (PCI DSS)
- General Data Protection Regulation (GDPR)
- California Consumer Privacy Act (CCPA)
- Sales tax collection requirements
- Refund and cancellation policies

Consult with legal counsel before accepting real payments.
