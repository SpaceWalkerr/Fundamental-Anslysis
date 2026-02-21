/**
 * Subscription Management Component
 * Allow users to view and manage their subscription
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, CreditCard, Calendar, AlertCircle, ExternalLink, Loader2, TrendingUp, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface Subscription {
  subscription_id: string | null;
  plan_name: string;
  plan_type: 'free' | 'premium';
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  features: string[];
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

interface UsageData {
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
}

export default function SubscriptionManagement() {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Record<string, UsageData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      // Fetch subscription status
      const subResponse = await api.subscription.getStatus();
      setSubscription(subResponse.data);

      // Fetch usage data
      const usageData: Record<string, UsageData> = {};
      const usageTypes = ['screening_runs', 'analysis_runs', 'chat_messages'];
      
      for (const type of usageTypes) {
        try {
          const response = await api.subscription.getUsage(type);
          usageData[type] = response.data;
        } catch (error) {
          console.error(`Error fetching ${type} usage:`, error);
        }
      }
      
      setUsage(usageData);
    } catch (error) {
      console.error('Error fetching subscription:', error);
      toast.error('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setActionLoading(true);
    try {
      const returnUrl = window.location.origin + '/settings';
      const response = await api.subscription.createPortal(returnUrl);
      
      // Redirect to Stripe Customer Portal
      window.location.href = response.url;
    } catch (error: any) {
      console.error('Error opening portal:', error);
      toast.error(error.response?.data?.detail || 'Failed to open billing portal');
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setActionLoading(true);
    try {
      await api.subscription.cancelSubscription(subscription.subscription_id || '');
      
      toast.success('Subscription will be canceled at the end of the billing period');
      await fetchSubscriptionData(); // Refresh data
    } catch (error: any) {
      console.error('Error canceling subscription:', error);
      toast.error(error.response?.data?.detail || 'Failed to cancel subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; label: string }> = {
      active: { variant: 'default', label: 'Active' },
      trialing: { variant: 'secondary', label: 'Trial' },
      past_due: { variant: 'destructive', label: 'Past Due' },
      canceled: { variant: 'outline', label: 'Canceled' },
      expired: { variant: 'destructive', label: 'Expired' }
    };

    const config = statusMap[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return (used / limit) * 100;
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load subscription data. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  const isPremium = subscription.plan_type === 'premium';
  const isFree = subscription.plan_type === 'free';

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isPremium ? (
                <Crown className="h-8 w-8 text-yellow-500" />
              ) : (
                <Zap className="h-8 w-8 text-muted-foreground" />
              )}
              <div>
                <CardTitle>
                  {isPremium ? 'Premium Plan' : 'Free Plan'}
                </CardTitle>
                <CardDescription>
                  {isPremium 
                    ? 'Unlock all features and unlimited access'
                    : 'Perfect for getting started'}
                </CardDescription>
              </div>
            </div>
            {getStatusBadge(subscription.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Plan Details */}
          {isPremium && subscription.current_period_end && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {subscription.cancel_at_period_end 
                  ? `Cancels on ${formatDate(subscription.current_period_end)}`
                  : `Renews on ${formatDate(subscription.current_period_end)}`}
              </span>
            </div>
          )}

          {/* Warning for canceled subscription */}
          {subscription.cancel_at_period_end && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Subscription Canceled</AlertTitle>
              <AlertDescription>
                Your subscription will end on {formatDate(subscription.current_period_end)}.
                You'll still have access until then.
              </AlertDescription>
            </Alert>
          )}

          {/* Features */}
          <div>
            <h4 className="font-semibold mb-3">Plan Features</h4>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {subscription.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            {isFree && (
              <Button onClick={() => navigate('/pricing')} className="bg-gradient-to-r from-blue-600 to-purple-600">
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Premium
              </Button>
            )}

            {isPremium && (
              <>
                <Button
                  onClick={handleManageSubscription}
                  disabled={actionLoading}
                  variant="outline"
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  Manage Billing
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>

                {!subscription.cancel_at_period_end && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={actionLoading}>
                        Cancel Subscription
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Your subscription will remain active until {formatDate(subscription.current_period_end)}.
                          You'll lose access to all Premium features after that date.
                          You can resubscribe anytime.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleCancelSubscription}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Cancel Subscription
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      {usage && (
        <Card>
          <CardHeader>
            <CardTitle>Usage This Month</CardTitle>
            <CardDescription>
              Track your usage against plan limits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(usage).map(([type, data]) => {
              const percentage = getUsagePercentage(data.used, data.limit);
              const isUnlimited = data.limit === -1;
              const typeLabel = type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

              return (
                <div key={type} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{typeLabel}</span>
                    <span className="text-muted-foreground">
                      {isUnlimited ? (
                        <Badge variant="secondary">Unlimited</Badge>
                      ) : (
                        `${data.used} / ${data.limit}`
                      )}
                    </span>
                  </div>
                  {!isUnlimited && (
                    <div className="relative">
                      <Progress value={percentage} className="h-2" />
                      <div 
                        className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getUsageColor(percentage)}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {isFree && (
              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertTitle>Need more?</AlertTitle>
                <AlertDescription>
                  Upgrade to Premium for unlimited usage on all features.
                  <Button
                    variant="link"
                    className="h-auto p-0 ml-1"
                    onClick={() => navigate('/pricing')}
                  >
                    View plans
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
