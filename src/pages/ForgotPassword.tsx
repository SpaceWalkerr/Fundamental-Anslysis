import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import Header from "@/components/landing/Header";

const ForgotPassword = () => {
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    try {
      setIsLoading(true);

      const { error } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Password reset email sent.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.message || "Failed to send reset email",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
              Forgot Password
            </h1>

            <p className="text-muted-foreground">
              Enter your email to receive a reset link
            </p>
          </div>

          <form
            onSubmit={handleForgotPassword}
            className="space-y-6"
          >
            <div className="space-y-2">
              <Label htmlFor="email">
                Email address
              </Label>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />

                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="pl-10"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-lg font-medium"
              disabled={isLoading}
            >
              {isLoading
                ? "Sending..."
                : "Send Reset Link"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Remember your password?{" "}
            <Link
              to="/login"
              className="text-primary hover:underline font-medium"
            >
              Back to login
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPassword;
