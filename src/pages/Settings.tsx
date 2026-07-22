import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  User,
  CreditCard,
  SlidersHorizontal,
  Shield,
  Key,
  Sparkles,
  Check,
  Coins,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import { usePlanStore, billingFor, formatTokens } from "@/store/usePlanStore";
import { useRegion } from "@/hooks/use-region";
import { formatPrice } from "@/lib/currency";
import RegionSwitcher from "@/components/RegionSwitcher";
import { api, authApi } from "@/lib/api";
import { supabase } from "@/lib/supabase";

const STYLE_OPTIONS = [
  { id: "beginner", label: "New to investing" },
  { id: "value", label: "Value" },
  { id: "growth", label: "Growth" },
  { id: "income", label: "Dividends / Income" },
  { id: "trader", label: "Shorter-term" },
  { id: "balanced", label: "Balanced" },
];
const HORIZON_OPTIONS = [
  { id: "long_term", label: "Long term (years)" },
  { id: "medium", label: "Medium (6–18 months)" },
  { id: "short", label: "Short term" },
];

const initials = (name?: string) =>
  (name || "You")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "U";

const Settings = () => {
  const navigate = useNavigate();
  const { user, patchUser, logout } = useAuthStore();
  const isPro = usePlanStore((s) => s.isPro)();
  const wallet = usePlanStore((s) => s.wallet);
  const fetchWallet = usePlanStore((s) => s.fetchWallet);
  const openBuyTokens = usePlanStore((s) => s.openBuyTokens);
  const openUpgrade = usePlanStore((s) => s.openUpgrade);
  const { region } = useRegion();
  const bp = billingFor(region);

  // Profile
  const [name, setName] = useState(user?.name || "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Subscription validity
  const [validUntil, setValidUntil] = useState<string | null>(null);

  // Preferences
  const [prefStyle, setPrefStyle] = useState(
    () => localStorage.getItem("fk_pref_style") || "balanced"
  );
  const [prefHorizon, setPrefHorizon] = useState(
    () => localStorage.getItem("fk_pref_horizon") || "long_term"
  );

  // Security — password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  // Security — delete account
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setName(user?.name || "");
  }, [user?.name]);

  useEffect(() => {
    fetchWallet();
    api.razorpay
      .getPlan()
      .then((res: any) => setValidUntil(res?.valid_until || null))
      .catch(() => {});
  }, [fetchWallet]);

  const nameChanged = name.trim() !== (user?.name || "").trim();
  const nameValid = name.trim().length >= 1 && name.trim().length <= 80;

  const handleSaveProfile = async () => {
    if (!nameChanged || !nameValid) return;
    setSavingProfile(true);
    try {
      await authApi.updateProfile({ name: name.trim() });
      patchUser({ name: name.trim() });
      toast.success("Profile updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update your profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const savePref = (key: string, value: string, setter: (v: string) => void) => {
    setter(value);
    localStorage.setItem(key, value);
    toast.success("Preference saved");
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    if (newPassword === currentPassword) {
      toast.error("New password must be different from your current one");
      return;
    }
    if (!user?.email) {
      toast.error("Can't verify your account. Please sign in again.");
      return;
    }
    setChangingPw(true);
    try {
      // Re-authenticate to prove the current password is correct.
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (authErr) {
        toast.error("Current password is incorrect");
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast.error(error.message || "Couldn't update your password");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated");
    } finally {
      setChangingPw(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await authApi.deleteAccount();
      await supabase.auth.signOut().catch(() => {});
      // Clear device-local plan/tour state (region choice stays — device-level).
      Object.keys(localStorage)
        .filter((k) => k.startsWith("fk_"))
        .forEach((k) => localStorage.removeItem(k));
      await logout().catch(() => {});
      toast.success("Your account and data were deleted");
      navigate("/");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete your account");
      setDeleting(false);
    }
  };

  const walletPct = wallet
    ? Math.min(100, Math.round((wallet.balance / Math.max(1, wallet.monthly_grant)) * 100))
    : 0;

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
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your account preferences</p>
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
              <TabsTrigger value="preferences" className="gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                Preferences
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
                      {initials(user?.name)}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground capitalize">
                        {user?.plan || "free"} plan
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {user?.email}
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
                        maxLength={80}
                        className="bg-secondary border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={user?.email || ""}
                        disabled
                        className="bg-secondary border-border"
                      />
                      <p className="text-xs text-muted-foreground">
                        Email is your login and can't be changed here.
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={handleSaveProfile}
                    disabled={!nameChanged || !nameValid || savingProfile}
                    className="w-fit bg-primary text-white hover:bg-primary/90 gap-2"
                  >
                    {savingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                    {savingProfile ? "Saving…" : "Save Changes"}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Subscription Tab */}
            <TabsContent value="subscription" className="space-y-6">
              <div className="rounded-2xl bg-white border border-border p-6">
                <h2 className="text-lg font-semibold text-foreground mb-6">Current Plan</h2>

                <div className="p-4 rounded-lg bg-secondary/50 border border-border mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-semibold text-foreground">
                        {isPro ? "Premium ✦" : "Free Plan"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {isPro ? "Unlimited AI reports" : "5 AI reports per month"}
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-secondary text-sm text-muted-foreground">
                      Current Plan
                    </span>
                  </div>
                  {isPro ? (
                    validUntil && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Active until</span>
                        <span className="font-medium text-foreground">
                          {new Date(validUntil).toLocaleDateString(undefined, {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Reports used this month:</span>
                      <span className="font-medium text-foreground">
                        {user?.reportsUsed ?? 0} / {user?.reportsLimit ?? 5}
                      </span>
                    </div>
                  )}
                </div>

                {/* AI tokens */}
                {wallet && (
                  <div className="p-4 rounded-lg border border-border mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-primary" /> AI tokens
                      </span>
                      <span className="text-sm font-bold text-foreground">
                        {formatTokens(wallet.balance)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${walletPct}%` }}
                      />
                    </div>
                    <button
                      onClick={() => (isPro ? openBuyTokens() : openUpgrade("reports"))}
                      className="mt-2 text-[13px] font-semibold text-primary hover:underline"
                    >
                      {isPro ? "Buy more tokens" : "Get more with Pro →"}
                    </button>
                  </div>
                )}

                {isPro ? (
                  <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          You're on Premium
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Thanks for supporting FundaKaMental ✦
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
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
                          Unlimited reports, stock scanner, Q&amp;A, and more
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
                          onClick={() => openUpgrade("general")}
                          className="bg-primary text-white hover:bg-primary/90"
                        >
                          Upgrade — {formatPrice(bp.monthly, bp.currency)}/month
                        </Button>
                        <p className="text-xs text-primary font-medium mt-2">
                          or {formatPrice(bp.yearly, bp.currency)}/year — save 33%
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences" className="space-y-6">
              <div className="rounded-2xl bg-white border border-border p-6">
                <h2 className="text-lg font-semibold text-foreground mb-6">Preferences</h2>
                <div className="space-y-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-foreground">Region &amp; currency</p>
                      <p className="text-sm text-muted-foreground">
                        Prices, examples and market defaults follow your region.
                      </p>
                    </div>
                    <RegionSwitcher />
                  </div>

                  <div className="pt-6 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Default analysis style</Label>
                      <Select
                        value={prefStyle}
                        onValueChange={(v) => savePref("fk_pref_style", v, setPrefStyle)}
                      >
                        <SelectTrigger className="bg-secondary border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STYLE_OPTIONS.map((o) => (
                            <SelectItem key={o.id} value={o.id}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Default horizon</Label>
                      <Select
                        value={prefHorizon}
                        onValueChange={(v) => savePref("fk_pref_horizon", v, setPrefHorizon)}
                      >
                        <SelectTrigger className="bg-secondary border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {HORIZON_OPTIONS.map((o) => (
                            <SelectItem key={o.id} value={o.id}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Used as the starting point for every new analysis.
                  </p>
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
                        <Input
                          id="currentPassword"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="bg-secondary border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="bg-secondary border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="bg-secondary border-border"
                        />
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleChangePassword}
                        disabled={changingPw}
                        className="gap-2"
                      >
                        {changingPw && <Loader2 className="w-4 h-4 animate-spin" />}
                        {changingPw ? "Updating…" : "Update Password"}
                      </Button>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-border">
                    <h3 className="font-medium text-destructive mb-2">Delete Account</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Permanently delete your account and all data
                    </p>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setDeleteConfirm("");
                        setDeleteOpen(true);
                      }}
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

      {/* Delete account confirmation */}
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => !open && !deleting && setDeleteOpen(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes your account, reports, portfolios, watchlists and
              wallet. This cannot be undone. Type <strong>DELETE</strong> to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="DELETE"
            className="bg-secondary border-border"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteAccount();
              }}
              disabled={deleteConfirm !== "DELETE" || deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Settings;
