/**
 * Pricing Page
 * Display subscription plans with comparison and checkout
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, X, Loader2, Zap, Crown, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  description: string;
  price_monthly: number;
  price_yearly: number | null;
  features: string[];
  plan_type: 'free' | 'premium';
  limits: {
    max_watchlist_stocks: number;
    max_alerts: number;
    max_screening_runs_per_day: number;
    max_analysis_runs_per_day: number;
    max_chat_messages_per_day: number;
    enable_technical_indicators: boolean;
    enable_realtime_data: boolean;
    enable_advanced_screening: boolean;
    enable_pdf_export: boolean;
    enable_email_alerts: boolean;
    enable_priority_support: boolean;
  };
}

export default function Pricing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);

  useEffect(() => {
    fetchPlans();
    fetchCurrentSubscription();
    
    // Check for payment status in URL
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      toast.success('Payment successful! Your subscription is now active.');
    } else if (paymentStatus === 'canceled') {
      toast.error('Payment was canceled. You can try again anytime.');
    }
  }, [searchParams]);

  const fetchPlans = async () => {
    try {
      const response = await api.get('/subscription-plans');
      setPlans(response.data);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      const response = await api.get('/subscription/status');
      setCurrentSubscription(response.data);
    } catch (error) {
      // User might not be logged in or have no subscription
      console.log('No subscription found');
    }
  };

  const handleSubscribe = async (planName: string) => {
    if (planName === 'free') {
      toast.info('You are already on the free plan!');
      return;
    }

    setCheckoutLoading(planName);

    try {
      const response = await api.post('/subscription/checkout', {
        plan_name: planName,
        billing_cycle: billingCycle,
        success_url: `${window.location.origin}/pricing?payment=success`,
        cancel_url: `${window.location.origin}/pricing?payment=canceled`
      });

      // Redirect to Stripe Checkout
      window.location.href = response.data.url;
    } catch (error: any) {
      console.error('Error creating checkout:', error);
      toast.error(error.response?.data?.detail || 'Failed to start checkout');
      setCheckoutLoading(null);
    }
  };

  const getPrice = (plan: SubscriptionPlan) => {
    if (plan.plan_type === 'free') return 0;
    
    if (billingCycle === 'yearly' && plan.price_yearly) {
      return plan.price_yearly / 12; // Monthly equivalent
    }
    
    return plan.price_monthly;
  };

  const getTotalPrice = (plan: SubscriptionPlan) => {
    if (plan.plan_type === 'free') return 0;
    
    if (billingCycle === 'yearly' && plan.price_yearly) {
      return plan.price_yearly;
    }
    
    return plan.price_monthly;
  };

  const getSavings = (plan: SubscriptionPlan) => {
    if (billingCycle === 'monthly' || !plan.price_yearly) return null;
    
    const yearlyTotal = plan.price_monthly * 12;
    const savings = yearlyTotal - plan.price_yearly;
    const savingsPercent = Math.round((savings / yearlyTotal) * 100);
    
    return { amount: savings, percent: savingsPercent };
  };

  const isCurrentPlan = (planName: string) => {
    return currentSubscription?.plan_name === planName;
  };

  const isPlanUpgrade = (planName: string) => {
    if (!currentSubscription) return false;
    if (currentSubscription.plan_type === 'free' && planName === 'premium') return true;
    return false;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const freePlan = plans.find(p => p.plan_type === 'free');
  const premiumPlan = plans.find(p => p.plan_type === 'premium');

  return (
    <div className="container mx-auto px-4 py-16">
      {/* Header */}
      <div className="text-center mb-12">
        <Badge variant="outline" className="mb-4">
          <Zap className="h-3 w-3 mr-1" />
          Pricing
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Choose Your Plan
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Start with our free plan or unlock all features with Premium
        </p>
      </div>

      {/* Billing Cycle Toggle */}
      <div className="flex items-center justify-center gap-4 mb-12">
        <Label htmlFor="billing-cycle" className={billingCycle === 'monthly' ? 'font-semibold' : ''}>
          Monthly
        </Label>
        <Switch
          id="billing-cycle"
          checked={billingCycle === 'yearly'}
          onCheckedChange={(checked) => setBillingCycle(checked ? 'yearly' : 'monthly')}
        />
        <Label htmlFor="billing-cycle" className={billingCycle === 'yearly' ? 'font-semibold' : ''}>
          Yearly
        </Label>
        {billingCycle === 'yearly' && (
          <Badge variant="secondary" className="ml-2">
            Save up to 17%
          </Badge>
        )}
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {/* Free Plan */}
        {freePlan && (
          <Card className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Shield className="h-8 w-8 text-muted-foreground" />
                {isCurrentPlan('free') && (
                  <Badge variant="secondary">Current Plan</Badge>
                )}
              </div>
              <CardTitle className="text-2xl mt-4">{freePlan.display_name}</CardTitle>
              <CardDescription>{freePlan.description}</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {freePlan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-semibold text-sm mb-3">Limits:</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• {freePlan.limits.max_watchlist_stocks} stocks in watchlist</li>
                  <li>• {freePlan.limits.max_screening_runs_per_day} screening runs/day</li>
                  <li>• {freePlan.limits.max_analysis_runs_per_day} analysis runs/day</li>
                  <li>• {freePlan.limits.max_chat_messages_per_day} chat messages/day</li>
                </ul>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                variant={isCurrentPlan('free') ? 'secondary' : 'outline'}
                disabled
              >
                {isCurrentPlan('free') ? 'Current Plan' : 'Free Forever'}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Premium Plan */}
        {premiumPlan && (
          <Card className="relative border-primary shadow-lg">
            {/* Popular Badge */}
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <Crown className="h-3 w-3 mr-1" />
                Most Popular
              </Badge>
            </div>

            <CardHeader>
              <div className="flex items-center justify-between">
                <Crown className="h-8 w-8 text-primary" />
                {isCurrentPlan('premium') && (
                  <Badge>Current Plan</Badge>
                )}
              </div>
              <CardTitle className="text-2xl mt-4">{premiumPlan.display_name}</CardTitle>
              <CardDescription>{premiumPlan.description}</CardDescription>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-bold">
                  ${getPrice(premiumPlan).toFixed(0)}
                </span>
                <span className="text-muted-foreground">/month</span>
              </div>
              {billingCycle === 'yearly' && getSavings(premiumPlan) && (
                <div className="text-sm text-green-600 font-medium">
                  Save ${getSavings(premiumPlan)!.amount} ({getSavings(premiumPlan)!.percent}%) yearly
                </div>
              )}
              {billingCycle === 'yearly' && (
                <div className="text-xs text-muted-foreground">
                  Billed ${getTotalPrice(premiumPlan)} per year
                </div>
              )}
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {premiumPlan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-semibold text-sm mb-3">Premium Features:</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Unlimited everything</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Technical indicators (RSI, MACD, etc.)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Real-time market data</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Advanced screening</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>PDF exports</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Email notifications</span>
                  </li>
                </ul>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                onClick={() => handleSubscribe('premium')}
                disabled={checkoutLoading === 'premium' || isCurrentPlan('premium')}
              >
                {checkoutLoading === 'premium' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : isCurrentPlan('premium') ? (
                  'Current Plan'
                ) : isPlanUpgrade('premium') ? (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Upgrade to Premium
                  </>
                ) : (
                  'Get Started'
                )}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>

      {/* FAQ or Additional Info */}
      <div className="mt-16 max-w-3xl mx-auto">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Secure Payment:</strong> All payments are processed securely through Stripe.
            Cancel anytime with no hidden fees. Your data is always protected.
          </AlertDescription>
        </Alert>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Need help choosing? Contact our support team or view our FAQ.
          </p>
          <div className="flex gap-4 justify-center">
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
            <Button variant="outline" onClick={() => navigate('/settings')}>
              Manage Subscription
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
