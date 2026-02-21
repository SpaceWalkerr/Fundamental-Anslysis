/**
 * Premium Feature Lock Component
 * Show upgrade prompt for premium features
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Lock, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { api } from '@/lib/api';

interface PremiumFeatureLockProps {
  /** Feature name to check access for */
  featureName?: string;
  /** Title of the locked feature */
  title?: string;
  /** Description of what the feature does */
  description?: string;
  /** Children to render if user has access */
  children?: React.ReactNode;
  /** Show as inline card or overlay dialog */
  variant?: 'card' | 'overlay' | 'inline';
  /** Custom className */
  className?: string;
}

/**
 * Premium Feature Lock Component
 * 
 * Checks if user has access to a premium feature and shows upgrade prompt if not
 * 
 * Usage:
 * ```tsx
 * <PremiumFeatureLock featureName="technical_indicators" variant="card">
 *   <TechnicalIndicators ticker="AAPL" />
 * </PremiumFeatureLock>
 * ```
 */
export function PremiumFeatureLock({
  featureName,
  title = 'Premium Feature',
  description = 'Upgrade to Premium to unlock this feature',
  children,
  variant = 'card',
  className = ''
}: PremiumFeatureLockProps) {
  const navigate = useNavigate();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    checkAccess();
  }, [featureName]);

  const checkAccess = async () => {
    if (!featureName) {
      // If no feature name provided, assume it's accessible
      setHasAccess(true);
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/subscription/check-feature', {
        feature_name: featureName
      });
      setHasAccess(response.data.has_access);
    } catch (error) {
      console.error('Error checking feature access:', error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    navigate('/pricing');
  };

  // Show loading state
  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-32 bg-muted rounded-lg" />
      </div>
    );
  }

  // User has access - render children
  if (hasAccess) {
    return <>{children}</>;
  }

  // User doesn't have access - show lock screen
  if (variant === 'card') {
    return (
      <Card className={`border-dashed ${className}`}>
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center mb-4">
            <Crown className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="flex flex-col gap-2">
            <Badge variant="outline" className="mx-auto">
              <Crown className="h-3 w-3 mr-1" />
              Premium Only
            </Badge>
          </div>
          <Button 
            onClick={handleUpgrade}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Zap className="h-4 w-4 mr-2" />
            Upgrade to Premium
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'overlay') {
    return (
      <div className={`relative ${className}`}>
        {/* Blurred content */}
        <div className="blur-sm pointer-events-none select-none">
          {children}
        </div>
        
        {/* Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <Card className="max-w-md mx-4 border-primary shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center mb-4">
                <Crown className="h-8 w-8 text-white" />
              </div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span>Unlimited access to all features</span>
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span>Real-time market data</span>
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span>Advanced technical analysis</span>
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span>Priority support</span>
                </li>
              </ul>
              <Button 
                onClick={handleUpgrade}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                size="lg"
              >
                <Crown className="h-5 w-5 mr-2" />
                Upgrade to Premium
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Inline variant - minimal lock indicator
  return (
    <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
      <Lock className="h-4 w-4" />
      <span>{title}</span>
      <Button variant="link" size="sm" onClick={handleUpgrade} className="h-auto p-0">
        Upgrade
      </Button>
    </div>
  );
}

/**
 * Simple Premium Badge
 * Shows a badge indicating a premium feature
 */
export function PremiumBadgeIndicator({ className = '' }: { className?: string }) {
  return (
    <Badge variant="secondary" className={`gap-1 ${className}`}>
      <Crown className="h-3 w-3" />
      Premium
    </Badge>
  );
}

/**
 * Usage Limit Warning
 * Shows warning when user is approaching their usage limit
 */
interface UsageLimitWarningProps {
  limitType: string;
  onUpgrade?: () => void;
}

export function UsageLimitWarning({ limitType, onUpgrade }: UsageLimitWarningProps) {
  const navigate = useNavigate();
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUsage();
  }, [limitType]);

  const checkUsage = async () => {
    try {
      const response = await api.get(`/subscription/usage/${limitType}`);
      setUsage(response.data);
    } catch (error) {
      console.error('Error checking usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      navigate('/pricing');
    }
  };

  if (loading || !usage) return null;

  // Don't show warning if unlimited
  if (usage.limit === -1) return null;

  // Show warning if used >= 80% of limit
  const usagePercent = (usage.used / usage.limit) * 100;
  if (usagePercent < 80) return null;

  return (
    <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <Lock className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
              {usagePercent >= 100 ? 'Limit Reached' : 'Approaching Limit'}
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              You've used {usage.used} out of {usage.limit} {limitType.replace('_', ' ')} today.
              {usagePercent >= 100 
                ? ' Upgrade to Premium for unlimited access.'
                : ' Consider upgrading for unlimited access.'}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleUpgrade}
              className="border-yellow-600 text-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900"
            >
              <Zap className="h-4 w-4 mr-2" />
              Upgrade Now
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default PremiumFeatureLock;
