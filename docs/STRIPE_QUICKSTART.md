# 💳 Stripe Payment System - Quick Start Guide

Get your payment system up and running in 10 minutes!

## 🚀 What's New

✅ **Subscription Plans:** Free and Premium tiers  
✅ **Stripe Integration:** Secure payment processing  
✅ **Feature Gating:** Premium features locked behind paywall  
✅ **Usage Limits:** Rate limiting based on plan  
✅ **Customer Portal:** Users can manage their own subscriptions  
✅ **Webhook Handling:** Automatic sync with Stripe events

---

## 📋 Prerequisites

- Stripe account (sign up at https://stripe.com)
- Supabase project running
- Backend server running

---

## ⚡ Quick Setup (3 Steps)

### Step 1: Create Stripe Account & Get API Keys

1. **Sign up for Stripe:** https://dashboard.stripe.com/register
2. **Get your API keys:**
   - Go to: https://dashboard.stripe.com/test/apikeys
   - Copy **Publishable key** (starts with `pk_test_`)
   - Copy **Secret key** (starts with `sk_test_`)
   - ⚠️ Start with test keys, switch to live keys when ready

3. **Get webhook secret:**
   - Go to: https://dashboard.stripe.com/test/webhooks
   - Click "Add endpoint"
   - Endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
   - Select events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`
   - Copy the **Webhook signing secret** (starts with `whsec_`)

### Step 2: Add Environment Variables

Add to your `backend/.env` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Frontend URL (for redirects)
FRONTEND_URL=http://localhost:5173
```

### Step 3: Create Stripe Products & Prices

1. **Install Stripe CLI** (optional but recommended):
```bash
brew install stripe/stripe-cli/stripe
stripe login
```

2. **Create Premium Product in Stripe Dashboard:**
   - Go to: https://dashboard.stripe.com/test/products
   - Click "Add product"
   - Name: `Premium Plan`
   - Description: `Unlock all features`
   
3. **Create Monthly Price:**
   - Price: `$29.00`
   - Billing period: `Monthly`
   - Copy the **Price ID** (starts with `price_`)

4. **Create Yearly Price:**
   - Price: `$290.00` (saves ~$58/year)
   - Billing period: `Yearly`
   - Copy the **Price ID** (starts with `price_`)

5. **Update database with Stripe IDs:**

```sql
-- Run this in Supabase SQL Editor
UPDATE subscription_plans 
SET 
  stripe_product_id = 'prod_YOUR_PRODUCT_ID',
  stripe_price_id_monthly = 'price_YOUR_MONTHLY_PRICE_ID',
  stripe_price_id_yearly = 'price_YOUR_YEARLY_PRICE_ID'
WHERE name = 'premium';

-- Verify it worked
SELECT name, stripe_product_id, stripe_price_id_monthly, stripe_price_id_yearly 
FROM subscription_plans;
```

---

## 🧪 Test the Integration

### 1. Run Database Migration

```bash
# In Supabase SQL Editor
# Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
# Copy and paste the contents of: backend/migrations/006_add_payment_system.sql
# Click "Run"
```

### 2. Install Stripe Python Package

```bash
cd backend
source venv/bin/activate
pip install stripe
```

### 3. Start Backend

```bash
cd backend
python -m uvicorn app.main:app --reload
```

### 4. Test Endpoints

```bash
# Check health
curl http://localhost:8000/api/subscription/health

# Get subscription plans (public endpoint)
curl http://localhost:8000/api/subscription-plans

# Get your subscription status (requires auth)
curl http://localhost:8000/api/subscription/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Create checkout session (requires auth)
curl -X POST http://localhost:8000/api/subscription/checkout \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"plan_name": "premium", "billing_cycle": "monthly"}'
```

### 5. Test Payment Flow

1. **Navigate to Pricing Page:**
   ```
   http://localhost:5173/pricing
   ```

2. **Click "Upgrade to Premium"**

3. **Complete checkout with test card:**
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any ZIP code

4. **Verify subscription:**
   ```
   http://localhost:5173/settings
   ```

---

## 🎯 Common Use Cases

### Use Case 1: Lock a Feature Behind Paywall

```python
# Backend: Lock technical indicators behind premium
from app.utils.feature_gates import require_technical_indicators

@router.get("/stocks/{ticker}/technicals")
async def get_technicals(
    ticker: str,
    user: dict = Depends(require_technical_indicators)
):
    # User has premium access
    return calculate_indicators(ticker)
```

```tsx
// Frontend: Show upgrade prompt for locked features
import { PremiumFeatureLock } from '@/components/PremiumFeatureLock';

<PremiumFeatureLock 
  featureName="technical_indicators"
  title="Technical Indicators"
  variant="card"
>
  <TechnicalIndicators ticker="AAPL" />
</PremiumFeatureLock>
```

### Use Case 2: Enforce Usage Limits

```python
# Backend: Limit screening runs per day
from app.utils.feature_gates import check_screening_limit

@router.post("/stocks/screen")
async def screen_stocks(
    filters: dict,
    user: dict = Depends(check_screening_limit)
):
    # Usage automatically checked and incremented
    # user["usage"] contains current usage info
    return perform_screening(filters)
```

### Use Case 3: Show Subscription Status in UI

```tsx
// Frontend: Display subscription info
import SubscriptionManagement from '@/components/SubscriptionManagement';

function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>
      <SubscriptionManagement />
    </div>
  );
}
```

---

## 🔧 Troubleshooting

### Issue: "No Stripe price ID configured"

**Solution:** Update subscription plans with Stripe price IDs:
```sql
UPDATE subscription_plans 
SET 
  stripe_price_id_monthly = 'price_YOUR_MONTHLY_ID',
  stripe_price_id_yearly = 'price_YOUR_YEARLY_ID'
WHERE name = 'premium';
```

### Issue: Webhook signature verification failed

**Solution:** Make sure webhook secret is correct in `.env`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_your_actual_secret
```

### Issue: "User has no Stripe customer ID"

**Solution:** User needs to complete checkout first. Customer ID is created during first checkout.

### Issue: Payment succeeded but subscription not updated

**Solution:** Check webhook logs:
```sql
SELECT * FROM stripe_webhook_events 
WHERE processed = false 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 📊 Verify Everything Works

### Check Database

```sql
-- View all subscription plans
SELECT * FROM subscription_plans;

-- View active subscriptions
SELECT 
  u.email,
  s.status,
  sp.display_name,
  s.current_period_end
FROM subscriptions s
JOIN auth.users u ON s.user_id = u.id
JOIN subscription_plans sp ON s.plan_id = sp.id
WHERE s.status = 'active';

-- View webhook events
SELECT 
  event_type, 
  processed, 
  created_at 
FROM stripe_webhook_events 
ORDER BY created_at DESC 
LIMIT 20;

-- View payment history
SELECT 
  u.email,
  ph.amount,
  ph.status,
  ph.created_at
FROM payment_history ph
JOIN auth.users u ON ph.user_id = u.id
ORDER BY ph.created_at DESC
LIMIT 20;
```

### Test Feature Access

```bash
# Check if user has access to technical indicators
curl -X POST http://localhost:8000/api/subscription/check-feature \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"feature_name": "technical_indicators"}'

# Check usage limits
curl http://localhost:8000/api/subscription/usage/screening_runs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🚀 Going Live

### 1. Switch to Live Mode

1. **Get live API keys:**
   - Go to: https://dashboard.stripe.com/apikeys (no `/test/` in URL)
   - Toggle to **Live mode** (top right)
   - Copy live keys

2. **Update environment variables:**
```bash
STRIPE_SECRET_KEY=sk_live_your_live_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key
```

3. **Create live webhook:**
   - Go to: https://dashboard.stripe.com/webhooks
   - Add endpoint with your production URL
   - Update `STRIPE_WEBHOOK_SECRET` with live webhook secret

4. **Verify Stripe products:**
   - Ensure Premium product exists in live mode
   - Update database with live price IDs

### 2. Test with Real Card

Start with a $1 test to verify everything works before announcing.

### 3. Legal Requirements

- [ ] Add Terms of Service
- [ ] Add Privacy Policy
- [ ] Add Refund Policy
- [ ] Display pricing clearly
- [ ] Handle failed payments gracefully

---

## 📚 Next Steps

- [ ] Set up email notifications for subscription changes
- [ ] Add promotional codes/coupons
- [ ] Implement free trial period (modify subscription_plans table)
- [ ] Add analytics tracking for conversions
- [ ] Create onboarding flow for new premium users
- [ ] Implement downgrade flow (premium → free)

---

## 🆘 Need Help?

**Stripe Documentation:** https://stripe.com/docs  
**Stripe Test Cards:** https://stripe.com/docs/testing  
**Webhook Testing:** Use Stripe CLI to forward webhooks to localhost

```bash
# Forward webhooks to local dev server
stripe listen --forward-to localhost:8000/api/webhooks/stripe

# Test a webhook event
stripe trigger checkout.session.completed
```

---

## 🎉 You're Done!

Your payment system is now live! Users can:

✅ View pricing plans  
✅ Subscribe to Premium  
✅ Manage their subscription  
✅ Cancel anytime  
✅ Access premium features  
✅ Stay within usage limits

**Want to see it in action?** Visit `/pricing` in your app!
