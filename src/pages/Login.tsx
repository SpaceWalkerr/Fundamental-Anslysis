import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Eye, EyeOff, Shield, Check } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/landing/Header";

const Login = () => {
  const navigate = useNavigate();
  const { login, loginWithGoogle, skipLogin, isLoading, verifyMfa, logout, mfaRequired: storeMfaRequired, mfaFactors: storeMfaFactors } = useAuthStore();
  const { toast } = useToast();
  const isTestLoginEnabled = false;
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // MFA states
  const [showMfaInput, setShowMfaInput] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [mfaError, setMfaError] = useState("");

  // Handle auto-detection of MFA session requirements (e.g. after Google OAuth redirect)
  useEffect(() => {
    if (storeMfaRequired && storeMfaFactors && storeMfaFactors.length > 0) {
      setMfaFactors(storeMfaFactors);
      setShowMfaInput(true);
    } else {
      setShowMfaInput(false);
    }
  }, [storeMfaRequired, storeMfaFactors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await login(formData.email, formData.password);
      if (result?.mfaRequired) {
        setMfaFactors(result.factors);
        setShowMfaInput(true);
        toast({
          description: (
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-500/10 p-1.5 text-amber-600 dark:text-amber-400">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-foreground">2FA Required</p>
                <p className="text-xs text-muted-foreground">Please enter the verification code from your authenticator app.</p>
              </div>
            </div>
          ),
        });
      } else {
        toast({
          description: (
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-500/10 p-1.5 text-emerald-600 dark:text-emerald-400">
                <Check className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Welcome Back</p>
                <p className="text-xs text-muted-foreground">You've been logged in successfully!</p>
              </div>
            </div>
          ),
        });
        navigate("/dashboard");
      }
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        description: (
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 dark:bg-red-950/40 p-1.5 text-red-600 dark:text-red-400">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Login Failed</p>
              <p className="text-xs text-muted-foreground">{err.message || "Invalid email or password."}</p>
            </div>
          </div>
        ),
      });
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode || mfaCode.length !== 6) {
      setMfaError("Please enter a valid 6-digit code.");
      return;
    }
    
    setMfaError("");
    const factor = mfaFactors[0];
    if (!factor) {
      setMfaError("No active MFA authenticator found. Please contact support.");
      return;
    }

    try {
      await verifyMfa(factor.id, mfaCode);
      toast({
        description: (
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-500/10 p-1.5 text-emerald-600 dark:text-emerald-400">
              <Check className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Verified</p>
              <p className="text-xs text-muted-foreground">2FA verified successfully!</p>
            </div>
          </div>
        ),
      });
      navigate("/dashboard");
    } catch (error: any) {
      setMfaError(error.message || "Invalid verification code.");
      toast({
        description: (
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 dark:bg-red-950/40 p-1.5 text-red-600 dark:text-red-400">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground">MFA Failed</p>
              <p className="text-xs text-muted-foreground">{error.message || "Invalid verification code."}</p>
            </div>
          </div>
        ),
      });
    }
  };

  const handleSkipLogin = () => {
    try {
      skipLogin();
      toast({
        description: (
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-500/10 p-1.5 text-emerald-600 dark:text-emerald-400">
              <Check className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Test mode</p>
              <p className="text-xs text-muted-foreground">Signed in as Test User.</p>
            </div>
          </div>
        ),
      });
      navigate("/dashboard");
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        description: (
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 dark:bg-red-950/40 p-1.5 text-red-600 dark:text-red-400">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Test Login Failed</p>
              <p className="text-xs text-muted-foreground">{err.message || "Test login is not available."}</p>
            </div>
          </div>
        ),
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <div className="flex-1 flex items-center justify-center p-8 pt-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {showMfaInput ? "Enter 2FA Code" : "Login"}
            </h1>
            <p className="text-muted-foreground">
              {showMfaInput ? "Two-Factor Verification Required" : "Welcome back to your account"}
            </p>
          </div>

          {showMfaInput ? (
            /* MFA Verification Form */
            <form onSubmit={handleMfaSubmit} className="space-y-6">
              <div className="space-y-2 text-center">
                <p className="text-sm text-muted-foreground">
                  Open your Google Authenticator or standard TOTP application to fetch your code.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mfaCode" className="sr-only">Verification Code</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="mfaCode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000"
                    className="pl-10 text-center text-2xl tracking-widest font-semibold"
                    value={mfaCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      setMfaCode(val);
                    }}
                    required
                    autoFocus
                  />
                </div>
                {mfaError && (
                  <p className="text-sm text-destructive text-center mt-2">{mfaError}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-lg font-medium"
                disabled={isLoading}
              >
                {isLoading ? "Verifying..." : "Verify & Login"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full text-sm text-muted-foreground hover:text-foreground"
                onClick={async () => {
                  await logout();
                  setShowMfaInput(false);
                  setMfaCode("");
                  setMfaError("");
                }}
              >
                Back to Login
              </Button>
            </form>
          ) : (
            /* Standard Login Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    className="pl-10"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    to="/forgot-password"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-lg font-medium"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Login"}
              </Button>

              {isTestLoginEnabled && (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full h-12 text-base font-medium"
                  onClick={handleSkipLogin}
                  disabled={isLoading}
                >
                  Skip login for testing
                </Button>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>

                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with Social
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full h-12 text-base font-medium flex items-center gap-3 border border-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                onClick={async () => {
                  try {
                    await loginWithGoogle();
                  } catch (error: unknown) {
                    const err = error as Error;
                    toast({
                      description: (
                        <div className="flex items-center gap-3">
                          <div className="rounded-full bg-red-100 dark:bg-red-950/40 p-1.5 text-red-600 dark:text-red-400">
                            <Shield className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">Auth Failed</p>
                            <p className="text-xs text-muted-foreground">{err.message || "Google authentication failed."}</p>
                          </div>
                        </div>
                      ),
                    });
                  }
                }}
              >
                <img
                  src="https://www.svgrepo.com/show/475656/google-color.svg"
                  alt="Google"
                  className="w-5 h-5"
                  loading="lazy"
                />

                Continue with Google
              </Button>
            </form>
          )}

          {/* Sign Up Link */}
          <p className="text-center text-sm text-muted-foreground mt-8">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary hover:underline font-medium">
              Create a free account
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
