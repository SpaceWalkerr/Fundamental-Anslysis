import { useState } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  User, CreditCard, Bell, Shield, Key, Check, AlertTriangle,
} from "lucide-react";

type TabKey = "profile" | "subscription" | "notifications" | "security";

const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "profile", label: "Profile", icon: User },
  { key: "subscription", label: "Subscription", icon: CreditCard },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "security", label: "Security", icon: Shield },
];

const Settings = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("profile");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [reportAlerts, setReportAlerts] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState(true);

  const inputStyle: React.CSSProperties = { borderRadius: 8, borderColor: "#E2E8F0" };

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8">
          <h1 className="font-bold mb-2" style={{ fontSize: 28, color: "#111625" }}>Settings</h1>
          <p style={{ fontSize: 14, color: "#64748B" }}>Manage your account preferences</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
          {/* Tab Bar */}
          <div className="bg-white border-b" style={{ borderColor: "#E2E8F0", borderRadius: "12px 12px 0 0", padding: "8px 8px 0" }}>
            <div className="flex gap-1 pb-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all duration-200 mb-[-1px]"
                    style={{
                      borderRadius: 999,
                      backgroundColor: isActive ? "#00AA5B" : "transparent",
                      color: isActive ? "#FFFFFF" : "#4B5563",
                      marginBottom: 8,
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-white border border-t-0" style={{ borderColor: "#E2E8F0", borderRadius: "0 0 12px 12px", padding: 24 }}>
            {/* ── Profile ── */}
            {activeTab === "profile" && (
              <motion.div key="profile" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
                <h2 className="font-semibold" style={{ fontSize: 18, color: "#111625" }}>Profile Information</h2>

                {/* Avatar */}
                <div className="flex items-center gap-6">
                  <div className="flex items-center justify-center text-2xl font-bold text-white" style={{ width: 72, height: 72, borderRadius: "50%", backgroundColor: "#00AA5B" }}>JA</div>
                  <div>
                    <Button variant="outline" size="sm" className="hover:border-[#00AA5B] hover:text-[#00AA5B]" style={{ borderRadius: 8, borderColor: "#E2E8F0" }}>Change Avatar</Button>
                    <p className="mt-2" style={{ fontSize: 12, color: "#64748B" }}>JPG, PNG or GIF. Max 2MB</p>
                  </div>
                </div>

                {/* Name + Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" style={{ fontSize: 12, color: "#4B5563" }}>Full Name</Label>
                    <Input id="fullName" defaultValue="John Analyst" className="bg-white focus:ring-2 focus:ring-[#00AA5B]/20 focus:border-[#00AA5B]" style={inputStyle} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" style={{ fontSize: 12, color: "#4B5563" }}>Email</Label>
                    <Input id="email" type="email" defaultValue="john@example.com" className="bg-white focus:ring-2 focus:ring-[#00AA5B]/20 focus:border-[#00AA5B]" style={inputStyle} />
                  </div>
                </div>

                {/* Company */}
                <div className="space-y-2">
                  <Label htmlFor="company" style={{ fontSize: 12, color: "#4B5563" }}>Company (Optional)</Label>
                  <Input id="company" placeholder="Your company name" className="bg-white focus:ring-2 focus:ring-[#00AA5B]/20 focus:border-[#00AA5B]" style={inputStyle} />
                </div>

                <Button className="text-white font-medium" style={{ backgroundColor: "#00AA5B", borderRadius: 8 }}>Save Changes</Button>
              </motion.div>
            )}

            {/* ── Subscription ── */}
            {activeTab === "subscription" && (
              <motion.div key="subscription" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
                <h2 className="font-semibold" style={{ fontSize: 18, color: "#111625" }}>Current Plan</h2>

                {/* Current Plan Card */}
                <div className="border p-5" style={{ borderColor: "#E2E8F0", borderRadius: 12, backgroundColor: "#F0FDF4" }}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-bold" style={{ fontSize: 16, color: "#111625" }}>Free Plan</p>
                      <p style={{ fontSize: 13, color: "#64748B" }}>5 reports per month</p>
                    </div>
                    <span className="px-3 py-1 text-xs font-medium" style={{ borderRadius: 999, backgroundColor: "#E1F7EC", color: "#00AA5B" }}>Current Plan</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span style={{ color: "#4B5563" }}>Reports used this month</span>
                      <span className="font-semibold" style={{ color: "#111625" }}>2 / 5</span>
                    </div>
                    <Progress value={40} className="h-2" />
                  </div>
                </div>

                {/* Upgrade Card */}
                <div className="border-l-4 border p-5" style={{ borderLeftColor: "#00AA5B", borderColor: "#E2E8F0", borderRadius: 12 }}>
                  <h3 className="font-semibold mb-1" style={{ fontSize: 16, color: "#111625" }}>Upgrade to Premium</h3>
                  <p className="mb-4" style={{ fontSize: 13, color: "#64748B" }}>Unlimited reports, stock scanner, Q&A, and more</p>
                  <ul className="space-y-2 mb-5">
                    {["Unlimited analysis reports", "Stock screening engine", "Interactive Q&A", "PDF export", "Priority support"].map((f) => (
                      <li key={f} className="flex items-center gap-2" style={{ fontSize: 14, color: "#4B5563" }}>
                        <Check className="w-4 h-4 flex-shrink-0" style={{ color: "#00AA5B" }} />{f}
                      </li>
                    ))}
                  </ul>
                  <Button className="text-white font-medium" style={{ backgroundColor: "#00AA5B", borderRadius: 8 }}>Upgrade for $29/month</Button>
                </div>
              </motion.div>
            )}

            {/* ── Notifications ── */}
            {activeTab === "notifications" && (
              <motion.div key="notifications" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="space-y-0">
                <h2 className="font-semibold mb-6" style={{ fontSize: 18, color: "#111625" }}>Notification Preferences</h2>
                {[
                  { label: "Email Notifications", desc: "Receive notifications about your reports", checked: emailNotifications, onChange: setEmailNotifications },
                  { label: "Report Alerts", desc: "Get notified when analysis is complete", checked: reportAlerts, onChange: setReportAlerts },
                  { label: "Price Alerts", desc: "Get notified on significant price movements", checked: priceAlerts, onChange: setPriceAlerts },
                  { label: "Marketing Emails", desc: "Receive product updates and tips", checked: marketingEmails, onChange: setMarketingEmails },
                ].map((item, i, arr) => (
                  <div key={item.label} className="flex items-center justify-between py-5" style={{ borderBottom: i < arr.length - 1 ? "1px solid #E2E8F0" : "none" }}>
                    <div>
                      <p className="font-bold" style={{ fontSize: 15, color: "#111625" }}>{item.label}</p>
                      <p style={{ fontSize: 13, color: "#64748B" }}>{item.desc}</p>
                    </div>
                    <Switch checked={item.checked} onCheckedChange={item.onChange} />
                  </div>
                ))}
              </motion.div>
            )}

            {/* ── Security ── */}
            {activeTab === "security" && (
              <motion.div key="security" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="space-y-8">
                {/* Change Password */}
                <div>
                  <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ fontSize: 16, color: "#111625" }}>
                    <Key className="w-4 h-4" /> Change Password
                  </h3>
                  <div className="max-w-md" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div className="space-y-1.5">
                      <Label htmlFor="currentPassword" style={{ fontSize: 12, color: "#4B5563" }}>Current Password</Label>
                      <Input id="currentPassword" type="password" className="bg-white" style={inputStyle} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="newPassword" style={{ fontSize: 12, color: "#4B5563" }}>New Password</Label>
                      <Input id="newPassword" type="password" className="bg-white" style={inputStyle} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="confirmPassword" style={{ fontSize: 12, color: "#4B5563" }}>Confirm Password</Label>
                      <Input id="confirmPassword" type="password" className="bg-white" style={inputStyle} />
                    </div>
                    <Button variant="outline" className="w-fit mt-2 hover:border-[#00AA5B] hover:text-[#00AA5B]" style={{ borderRadius: 8, borderColor: "#E2E8F0" }}>Update Password</Button>
                  </div>
                </div>

                {/* 2FA */}
                <div className="pt-6" style={{ borderTop: "1px solid #E2E8F0" }}>
                  <h3 className="font-semibold mb-3" style={{ fontSize: 16, color: "#111625" }}>Two-Factor Authentication</h3>
                  <div className="p-4 flex items-start gap-3" style={{ backgroundColor: "#FFFBEB", borderRadius: 12, border: "1px solid #FDE68A" }}>
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#D97706" }} />
                    <div>
                      <p className="font-medium" style={{ fontSize: 14, color: "#92400E" }}>2FA is not enabled</p>
                      <p className="mb-3" style={{ fontSize: 13, color: "#A16207" }}>Add an extra layer of security to your account</p>
                      <Button variant="outline" size="sm" className="hover:border-[#00AA5B] hover:text-[#00AA5B]" style={{ borderRadius: 8, borderColor: "#E2E8F0" }}>Enable 2FA</Button>
                    </div>
                  </div>
                </div>

                {/* Delete Account */}
                <div className="pt-6" style={{ borderTop: "1px solid #E2E8F0" }}>
                  <h3 className="font-semibold mb-2" style={{ fontSize: 16, color: "#DC2626" }}>Delete Account</h3>
                  <p className="mb-4" style={{ fontSize: 13, color: "#64748B" }}>Permanently delete your account and all data</p>
                  <Button variant="outline" className="hover:bg-[#DC2626] hover:text-white hover:border-[#DC2626]" style={{ borderRadius: 8, borderColor: "#DC2626", color: "#DC2626" }}>Delete Account</Button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
