import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/store/useAuthStore";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

// Temp supabase client for verifying current password without affecting main session
const tempSupabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || "",
  import.meta.env.VITE_SUPABASE_ANON_KEY || "",
  {
    auth: {
      persistSession: false,
    },
  }
);
import {
  User,
  Mail,
  CreditCard,
  Bell,
  Shield,
  Key,
  Sparkles,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";

const Settings = () => {
  const { user, updateUser, deleteAccount, refreshProfile } = useAuthStore();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Password fields state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Delete account confirmation modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // MFA (2FA) states
  const [showMfaModal, setShowMfaModal] = useState<'enroll' | 'disable' | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [isVerifyingMfa, setIsVerifyingMfa] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrolledFactors, setEnrolledFactors] = useState<any[]>([]);
  const [mfaError, setMfaError] = useState("");
  
  const handleUpdatePassword = async () => {
    if (!currentPassword) {
      toast({
        description: (
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 dark:bg-red-950/40 p-1.5 text-red-600 dark:text-red-400">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Validation Error</p>
              <p className="text-xs text-muted-foreground">Current password cannot be empty.</p>
            </div>
          </div>
        ),
      });
      return;
    }
    if (!newPassword || !confirmPassword) {
      toast({
        description: (
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 dark:bg-red-950/40 p-1.5 text-red-600 dark:text-red-400">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Validation Error</p>
              <p className="text-xs text-muted-foreground">Password fields cannot be empty.</p>
            </div>
          </div>
        ),
      });
      return;
    }
    if (newPassword === currentPassword) {
      toast({
        description: (
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 dark:bg-red-950/40 p-1.5 text-red-600 dark:text-red-400">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Validation Error</p>
              <p className="text-xs text-muted-foreground">New password must be different from current password.</p>
            </div>
          </div>
        ),
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        description: (
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 dark:bg-red-950/40 p-1.5 text-red-600 dark:text-red-400">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Validation Error</p>
              <p className="text-xs text-muted-foreground">Passwords do not match.</p>
            </div>
          </div>
        ),
      });
      return;
    }
    if (newPassword.length < 8) {
      toast({
        description: (
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 dark:bg-red-950/40 p-1.5 text-red-600 dark:text-red-400">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Validation Error</p>
              <p className="text-xs text-muted-foreground">Password must be at least 8 characters long.</p>
            </div>
          </div>
        ),
      });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      // 1. Verify current password
      const { error: verifyError } = await tempSupabase.auth.signInWithPassword({
        email: user?.email || "",
        password: currentPassword,
      });

      if (verifyError) {
        toast({
          description: (
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-100 dark:bg-red-950/40 p-1.5 text-red-600 dark:text-red-400">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Verification Failed</p>
                <p className="text-xs text-muted-foreground">Incorrect current password.</p>
              </div>
            </div>
          ),
        });
        setIsUpdatingPassword(false);
        return;
      }

      // 2. Perform the update
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast({
        description: (
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-500/10 p-1.5 text-emerald-600 dark:text-emerald-400">
              <Check className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Password Secured</p>
              <p className="text-xs text-muted-foreground">Your account password has been updated successfully.</p>
            </div>
          </div>
        ),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (error: any) {
      console.error("Error updating password:", error);
      toast({
        description: (
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 dark:bg-red-950/40 p-1.5 text-red-600 dark:text-red-400">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Update Failed</p>
              <p className="text-xs text-muted-foreground">{error.message || "Failed to update password."}</p>
            </div>
          </div>
        ),
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // MFA (2FA) Setup & teardown methods
  const fetchMfaStatus = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      
      const activeFactors = data?.all?.filter(factor => factor.status === 'verified') || [];
      const enrolled = activeFactors.length > 0;
      
      setIsEnrolled(enrolled);
      setEnrolledFactors(activeFactors);
    } catch (error) {
      console.error("Error listing MFA factors:", error);
    }
  };

  useEffect(() => {
    fetchMfaStatus();
    refreshProfile();
  }, [refreshProfile]);

  const handleStartEnrollment = async () => {
    setMfaError("");
    setIsVerifyingMfa(false);
    setMfaCode("");
    
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: user?.email || 'Fundamental Analysis Auth',
        issuer: 'Fundamental Analysis'
      });
      
      if (error) throw error;
      
      setMfaFactorId(data.id);
      setMfaSecret(data.totp.secret);
      setQrCodeUrl(data.totp.qr_code);
      setShowMfaModal('enroll');
    } catch (error: any) {
      console.error("MFA enrollment initiation failed:", error);
      toast({
        description: (
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 dark:bg-red-950/40 p-1.5 text-red-600 dark:text-red-400">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground">MFA Setup Failed</p>
              <p className="text-xs text-muted-foreground">{error.message || "Could not start 2FA enrollment."}</p>
            </div>
          </div>
        ),
      });
    }
  };

  const handleVerifyEnrollment = async () => {
    if (!mfaCode || mfaCode.length !== 6) {
      setMfaError("Please enter a valid 6-digit code.");
      return;
    }
    
    setMfaError("");
    setIsVerifyingMfa(true);
    
    try {
      // 1. Create challenge
      const challenge = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
      if (challenge.error) throw challenge.error;
      
      // 2. Verify challenge
      const verify = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.data.id,
        code: mfaCode
      });
      
      if (verify.error) throw verify.error;
      
      toast({
        description: (
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-500/10 p-1.5 text-emerald-600 dark:text-emerald-400">
              <Check className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground">2FA Enabled</p>
              <p className="text-xs text-muted-foreground">Multi-factor authentication has been enabled successfully!</p>
            </div>
          </div>
        ),
      });
      
      setShowMfaModal(null);
      await fetchMfaStatus();
    } catch (error: any) {
      console.error("MFA enrollment verification failed:", error);
      setMfaError(error.message || "Verification code is invalid. Please try again.");
    } finally {
      setIsVerifyingMfa(false);
    }
  };

  const handleStartDisableMfa = () => {
    if (enrolledFactors.length === 0) return;
    setMfaError("");
    setMfaCode("");
    setShowMfaModal('disable');
  };

  const handleConfirmDisableMfa = async () => {
    setIsVerifyingMfa(true);
    setMfaError("");
    
    try {
      for (const factor of enrolledFactors) {
        const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
        if (error) throw error;
      }
      
      toast({
        description: (
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-500/10 p-1.5 text-emerald-600 dark:text-emerald-400">
              <Check className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground">2FA Disabled</p>
              <p className="text-xs text-muted-foreground">Multi-factor authentication has been disabled.</p>
            </div>
          </div>
        ),
      });
      
      setShowMfaModal(null);
      await fetchMfaStatus();
    } catch (error: any) {
      console.error("Failed to disable 2FA:", error);
      setMfaError(error.message || "Failed to disable 2FA. Please try again.");
    } finally {
      setIsVerifyingMfa(false);
    }
  };

  const handleCancelMfaSetup = async () => {
    if (mfaFactorId && showMfaModal === 'enroll') {
      try {
        await supabase.auth.mfa.unenroll({ factorId: mfaFactorId });
      } catch (e) {
        console.warn("Unenrolling unverified factor on cancel failed:", e);
      }
    }
    setShowMfaModal(null);
    setMfaCode("");
    setMfaError("");
    setMfaFactorId("");
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmText !== "DELETE") return;

    setIsDeletingAccount(true);
    try {
      await deleteAccount();
      toast({
        description: (
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-500/10 p-1.5 text-emerald-600 dark:text-emerald-400">
              <Check className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Account Deleted</p>
              <p className="text-xs text-muted-foreground">Your account has been successfully deleted.</p>
            </div>
          </div>
        ),
      });
      setShowDeleteModal(false);
      navigate("/");
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast({
        description: (
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 dark:bg-red-950/40 p-1.5 text-red-600 dark:text-red-400">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Delete Failed</p>
              <p className="text-xs text-muted-foreground">{error.message || "Failed to delete account."}</p>
            </div>
          </div>
        ),
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const [emailNotifications, setEmailNotifications] = useState(user?.email_notifications !== false);
  const [marketingEmails, setMarketingEmails] = useState(user?.marketing_emails === true);
  const [reportAlerts, setReportAlerts] = useState(user?.report_alerts !== false);

  // Profile fields state
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [company, setCompany] = useState(user?.company || "");
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync state with user when auth loads
  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setCompany(user.company || "");
      setEmailNotifications(user.email_notifications !== false);
      setMarketingEmails(user.marketing_emails === true);
      setReportAlerts(user.report_alerts !== false);
    }
  }, [user]);

  const handleNotificationToggle = async (key: 'email_notifications' | 'marketing_emails' | 'report_alerts', value: boolean) => {
    try {
      await updateUser({ [key]: value });
      toast({
        description: (
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-500/10 p-1.5 text-emerald-600 dark:text-emerald-400">
              <Check className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Preference Saved</p>
              <p className="text-xs text-muted-foreground">Notification settings updated successfully.</p>
            </div>
          </div>
        ),
      });
    } catch (err: any) {
      console.error("Failed to update notification preference:", err);
      toast({
        description: (
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 dark:bg-red-950/40 p-1.5 text-red-600 dark:text-red-400">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Update Failed</p>
              <p className="text-xs text-muted-foreground">Failed to save preference.</p>
            </div>
          </div>
        ),
      });
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast({
        description: (
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 dark:bg-red-950/40 p-1.5 text-red-600 dark:text-red-400">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Validation Error</p>
              <p className="text-xs text-muted-foreground">Full name cannot be empty.</p>
            </div>
          </div>
        ),
      });
      return;
    }

    setIsUpdating(true);
    try {
      // Update name and company in store/Supabase/backend
      await updateUser({ name, company });

      toast({
        description: (
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-500/10 p-1.5 text-emerald-600 dark:text-emerald-400">
              <Check className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Profile Saved</p>
              <p className="text-xs text-muted-foreground">Your profile settings have been updated.</p>
            </div>
          </div>
        ),
      });
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        description: (
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 dark:bg-red-950/40 p-1.5 text-red-600 dark:text-red-400">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Update Failed</p>
              <p className="text-xs text-muted-foreground">{error.message || "Failed to update profile settings."}</p>
            </div>
          </div>
        ),
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your account preferences
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="bg-secondary/50 p-1 rounded-xl">
              <TabsTrigger value="profile" className="gap-2">
                <User className="w-4 h-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="subscription" className="gap-2">
                <CreditCard className="w-4 h-4" />
                Subscription
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2">
                <Bell className="w-4 h-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2">
                <Shield className="w-4 h-4" />
                Security
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <div className="rounded-2xl bg-white border border-border p-6">
                <h2 className="text-lg font-semibold text-foreground mb-6">
                  Profile Information
                </h2>
                <div className="grid gap-6">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-2xl font-bold text-primary-foreground">
                      {name
                        ? name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)
                        : "U"}
                    </div>
                    <div>
                      <Button variant="outline" size="sm">
                        Change Avatar
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        JPG, PNG or GIF. Max 2MB
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="bg-secondary border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div 
                        onClick={() => toast({
                          title: "Information",
                          description: "Email address cannot be changed.",
                        })}
                        className="cursor-not-allowed"
                      >
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          readOnly
                          className="bg-secondary border-border opacity-70 pointer-events-none select-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company">Company (Optional)</Label>
                    <Input
                      id="company"
                      placeholder="Your company name"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="bg-secondary border-border"
                    />
                  </div>

                  <Button 
                    onClick={handleSaveProfile} 
                    disabled={isUpdating}
                    className="w-fit bg-primary text-white hover:bg-primary/90"
                  >
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Subscription Tab */}
            <TabsContent value="subscription" className="space-y-6">
              <div className="rounded-2xl bg-white border border-border p-6">
                <h2 className="text-lg font-semibold text-foreground mb-6">
                  Current Plan
                </h2>

                <div className="p-4 rounded-lg bg-secondary/50 border border-border mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-semibold text-foreground capitalize">
                        {user?.plan || "Free"} Plan
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {user?.plan === 'premium' ? "Unlimited reports" : user?.plan === 'enterprise' ? "Custom enterprise tier" : `${user?.reportsLimit || 5} reports per month`}
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-secondary text-sm text-muted-foreground">
                      Current Plan
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Reports used this month:</span>
                    <span className="font-medium text-foreground">
                      {user?.reportsUsed || 0} / {user?.plan === 'premium' || user?.plan === 'enterprise' ? "∞" : user?.reportsLimit || 5}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1">
                        Upgrade to Premium
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Unlimited reports, stock scanner, Q&A, and more
                      </p>
                      <ul className="space-y-2 mb-4">
                        {[
                          "Unlimited analysis reports",
                          "Stock screening engine",
                          "Interactive Q&A",
                          "PDF export",
                          "Priority support",
                        ].map((feature) => (
                          <li
                            key={feature}
                            className="flex items-center gap-2 text-sm text-muted-foreground"
                          >
                            <Check className="w-4 h-4 text-success" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <Button 
                        onClick={() => navigate('/pricing')}
                        className="bg-primary text-white hover:bg-primary/90"
                      >
                        Upgrade for $29/month
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <div className="rounded-2xl bg-white border border-border p-6">
                <h2 className="text-lg font-semibold text-foreground mb-6">
                  Notification Preferences
                </h2>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">
                        Email Notifications
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications about your reports
                      </p>
                    </div>
                    <Switch
                      checked={emailNotifications}
                      onCheckedChange={(checked) => {
                        setEmailNotifications(checked);
                        handleNotificationToggle('email_notifications', checked);
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Report Alerts</p>
                      <p className="text-sm text-muted-foreground">
                        Get notified when analysis is complete
                      </p>
                    </div>
                    <Switch
                      checked={reportAlerts}
                      onCheckedChange={(checked) => {
                        setReportAlerts(checked);
                        handleNotificationToggle('report_alerts', checked);
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">
                        Marketing Emails
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Receive product updates and tips
                      </p>
                    </div>
                    <Switch
                      checked={marketingEmails}
                      onCheckedChange={(checked) => {
                        setMarketingEmails(checked);
                        handleNotificationToggle('marketing_emails', checked);
                      }}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <div className="rounded-2xl bg-white border border-border p-6">
                <h2 className="text-lg font-semibold text-foreground mb-6">
                  Security Settings
                </h2>

                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      Change Password
                    </h3>
                    <div className="space-y-4 max-w-md">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <div className="relative">
                          <Input
                            id="currentPassword"
                            type={showCurrentPassword ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="bg-secondary border-border pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="bg-secondary border-border pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showNewPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="bg-secondary border-border pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <Button 
                        onClick={handleUpdatePassword} 
                        disabled={isUpdatingPassword}
                        variant="outline"
                      >
                        {isUpdatingPassword ? "Updating..." : "Update Password"}
                      </Button>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-border">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-foreground">
                        Two-Factor Authentication (2FA)
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        isEnrolled ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" : "bg-zinc-100 text-zinc-500 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                      }`}>
                        {isEnrolled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Protect your account with a secondary verification code from an authenticator app when signing in.
                    </p>
                    {isEnrolled ? (
                      <Button onClick={handleStartDisableMfa} variant="destructive" className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground">
                        Disable 2FA
                      </Button>
                    ) : (
                      <Button onClick={handleStartEnrollment} variant="outline">
                        Enable 2FA
                      </Button>
                    )}
                  </div>

                  <div className="pt-6 border-t border-border">
                    <h3 className="font-medium text-destructive mb-2">
                      Delete Account
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Permanently delete your account and all data
                    </p>
                    <Button 
                      onClick={() => setShowDeleteModal(true)}
                      variant="destructive" 
                      className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      Delete Account
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* Delete Account Overlay Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isDeletingAccount) {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                }
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-destructive/20 bg-white dark:bg-zinc-950 p-6 shadow-2xl transition-all"
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 text-destructive">
                  <div className="rounded-full bg-destructive/10 p-3">
                    <Shield className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Delete Account</h3>
                </div>
                
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This action is permanent and <strong className="text-foreground">cannot be undone</strong>. 
                  All your analysis reports, portfolios, watchlists, and personal details will be permanently removed.
                </p>
                
                <div className="space-y-2 rounded-lg bg-destructive/5 p-3 border border-destructive/10">
                  <p className="text-xs font-semibold text-destructive uppercase tracking-wider">Warning</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    If you delete your account, any active subscriptions will be cancelled and access will be lost immediately.
                  </p>
                </div>
                
                <div className="space-y-2 mt-2">
                  <Label htmlFor="deleteConfirmInput" className="text-sm font-medium text-foreground">
                    Type <span className="font-bold text-destructive">DELETE</span> to confirm
                  </Label>
                  <Input
                    id="deleteConfirmInput"
                    type="text"
                    placeholder="Type DELETE"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="bg-secondary border-border"
                    disabled={isDeletingAccount}
                    autoFocus
                  />
                </div>
                
                <div className="flex items-center gap-3 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeleteConfirmText("");
                    }}
                    className="flex-1"
                    disabled={isDeletingAccount}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleConfirmDelete}
                    disabled={deleteConfirmText !== "DELETE" || isDeletingAccount}
                    className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeletingAccount ? "Deleting..." : "Delete Permanently"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MFA Modal */}
      <AnimatePresence>
        {showMfaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancelMfaSetup}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-white dark:bg-zinc-950 p-6 shadow-2xl transition-all"
            >
              {showMfaModal === 'enroll' ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 text-primary">
                    <div className="rounded-full bg-primary/10 p-3">
                      <Shield className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">Setup Two-Factor Auth</h3>
                  </div>
                  
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Scan the QR code below using your authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.) to set up 2FA.
                  </p>
                  
                  {qrCodeUrl && (
                    <div className="flex justify-center bg-white p-3 rounded-xl border border-border w-fit mx-auto shadow-inner">
                      <img
                        src={qrCodeUrl.startsWith("data:") ? qrCodeUrl : `data:image/svg+xml;utf-8,${encodeURIComponent(qrCodeUrl)}`}
                        alt="MFA QR Code"
                        className="w-48 h-48"
                      />
                    </div>
                  )}
                  
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase">Manual Setup Key</Label>
                    <code className="block font-mono text-xs bg-secondary p-2 rounded border border-border select-all break-all text-center">
                      {mfaSecret}
                    </code>
                  </div>
                  
                  <div className="space-y-2 mt-2">
                    <Label htmlFor="mfaSetupCode" className="text-sm font-medium text-foreground">
                      Enter 6-digit code from app
                    </Label>
                    <Input
                      id="mfaSetupCode"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="000000"
                      value={mfaCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        setMfaCode(val);
                      }}
                      className="bg-secondary border-border text-center text-lg tracking-widest font-semibold"
                      disabled={isVerifyingMfa}
                      autoFocus
                    />
                    {mfaError && (
                      <p className="text-sm text-destructive text-center mt-1 font-medium">{mfaError}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 mt-4">
                    <Button
                      variant="outline"
                      onClick={handleCancelMfaSetup}
                      className="flex-1"
                      disabled={isVerifyingMfa}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleVerifyEnrollment}
                      disabled={mfaCode.length !== 6 || isVerifyingMfa}
                      className="flex-1 bg-primary text-white hover:bg-primary/90"
                    >
                      {isVerifyingMfa ? "Verifying..." : "Verify & Enable"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 text-destructive">
                    <div className="rounded-full bg-destructive/10 p-3">
                      <Shield className="h-6 w-6 text-destructive" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">Disable Two-Factor Auth</h3>
                  </div>
                  
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Are you sure you want to disable two-factor authentication? This will make your account less secure and remove the requirement of secondary verification on sign in.
                  </p>
                  
                  {mfaError && (
                    <p className="text-sm text-destructive text-center font-medium">{mfaError}</p>
                  )}
                  
                  <div className="flex items-center gap-3 mt-4">
                    <Button
                      variant="outline"
                      onClick={handleCancelMfaSetup}
                      className="flex-1"
                      disabled={isVerifyingMfa}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleConfirmDisableMfa}
                      disabled={isVerifyingMfa}
                      className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isVerifyingMfa ? "Disabling..." : "Disable 2FA"}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default Settings;
