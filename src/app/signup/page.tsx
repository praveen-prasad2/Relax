"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { HiOutlineEye, HiOutlineEyeSlash } from "react-icons/hi2";
import { useSnackbar } from "@/components/Snackbar";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "otp">("form");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { showSnackbar } = useSnackbar();

  const parseJson = async (res: Response): Promise<{ error?: string; success?: boolean }> => {
    const text = await res.text();
    if (!text?.trim()) return {};
    try {
      return JSON.parse(text);
    } catch {
      return { error: res.ok ? "Invalid response" : "Verification failed. Please try again." };
    }
  };

  const validatePassword = (p: string) => {
    if (p.includes(" ")) return "Spaces not allowed";
    if (p.length < 8) return "Min 8 characters";
    if (!/[A-Z]/.test(p)) return "1 uppercase required";
    if (!/\d/.test(p)) return "1 number required";
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p)) return "1 special character required";
    return "";
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const pwErr = validatePassword(password);
    if (pwErr) {
      setError(pwErr);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
      });
      const data = await parseJson(res);
      if (!res.ok) {
        const msg = data.error || "Failed to send OTP";
        setError(msg);
        showSnackbar(msg, "error");
        return;
      }
      showSnackbar("OTP sent to your email", "success");
      setStep("otp");
    } catch (err) {
      const msg = "Network error. Please try again.";
      setError(msg);
      showSnackbar(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await parseJson(res);
      if (!res.ok) {
        const msg = data.error || "Verification failed";
        setError(msg);
        showSnackbar(msg, "error");
        return;
      }
      showSnackbar("Account created successfully", "success");
      router.push("/login?registered=1");
    } catch (err) {
      const msg = "Network error. Please try again.";
      setError(msg);
      showSnackbar(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F9FAFB] px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm space-y-6"
      >
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#111827]">Relax</h1>
          <p className="mt-2 text-[#6B7280]">Create your account</p>
        </div>
        {step === "form" ? (
          <form onSubmit={handleSendOtp} className="rounded-2xl bg-white p-6 shadow-lg border border-[#E5E7EB] space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-[#E5E7EB] px-4 py-3 text-[#111827]"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                maxLength={30}
                pattern="[a-zA-Z0-9_]+"
                className="w-full rounded-xl border border-[#E5E7EB] px-4 py-3 text-[#111827]"
                placeholder="johndoe"
              />
              <p className="mt-1 text-xs text-[#6B7280]">Letters, numbers, underscores only</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value.replace(/\s/g, ""))}
                  required
                  minLength={8}
                  className="w-full rounded-xl border border-[#E5E7EB] px-4 py-3 pr-12 text-[#111827]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#111827]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                {showPassword ? <HiOutlineEyeSlash className="h-5 w-5" /> : <HiOutlineEye className="h-5 w-5" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-[#6B7280]">1 uppercase, 1 number, 1 special char. No spaces. Min 8 chars</p>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#4F46E5] py-3.5 px-4 text-white font-medium hover:bg-[#4338CA] disabled:opacity-50"
            >
              {loading ? "Sending OTP..." : "Send verification code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="rounded-2xl bg-white p-6 shadow-lg border border-[#E5E7EB] space-y-4">
            <p className="text-sm text-[#6B7280]">
              We sent a 6-digit code to <strong>{email}</strong>
            </p>
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1.5">Verification code</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                maxLength={6}
                className="w-full rounded-xl border border-[#E5E7EB] px-4 py-3 text-[#111827] text-center text-lg tracking-widest"
                placeholder="000000"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#4F46E5] py-3.5 px-4 text-white font-medium hover:bg-[#4338CA] disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify & create account"}
            </button>
            <button
              type="button"
              onClick={() => setStep("form")}
              className="w-full text-sm text-[#6B7280]"
            >
              Use different email
            </button>
          </form>
        )}
        <p className="text-center text-sm text-[#6B7280]">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[#4F46E5]">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
