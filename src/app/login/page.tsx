"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Shield } from "lucide-react";
import { LogoSplit } from "@/components/ui/logo";
import { useFormik } from "formik";
import { loginSchema } from "@/lib/validationSchemas";
import { FormAlert } from "@/components/ui/form-alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { isAuthenticated } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const redirectTarget = searchParams?.get("redirect");
  const plan = searchParams?.get("plan");

  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const formik = useFormik({
    initialValues: { email: "", password: "" },
    validationSchema: loginSchema,
    onSubmit: async (values, { setSubmitting, setStatus }) => {
      setStatus(null);
      setUnverifiedEmail(null);
      setResendStatus(null);
      try {
        const { login, getCurrentUser } = await import("@/lib/api");
        const { setTokens, removeTokens } = await import("@/lib/auth");
        const tokens = await login(values.email.trim(), values.password);
        setTokens(tokens.access_token, tokens.refresh_token);
        
        // Fetch user to check role
        const user = await getCurrentUser(tokens.access_token);
        if (user.role === "user" || !user.role) {
          removeTokens();
          setStatus({ error: "This account is not an administrator." });
          setSubmitting(false);
          return;
        }

        localStorage.setItem("auth_provider", "email");

        // Redirect to admin overview page
        router.push("/");
      } catch (err: any) {
        const status = err?.status || err?.response?.status;
        let msg = err instanceof Error ? err.message : "Login failed";
        
        if (status === 401) {
          if (msg.includes("Email not verified")) {
            setUnverifiedEmail(values.email.trim());
          } else if (msg.includes("Account is deactivated")) {
            msg = "Contact an administrator";
          } else {
            msg = "Wrong email or password";
          }
        } else if (status === 403) {
          msg = "This account is not an administrator.";
        }
        
        setStatus({ error: msg });
        setSubmitting(false);
      }
    },
  });

  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  async function handleResendVerification() {
    if (!unverifiedEmail) return;
    setResending(true);
    setResendStatus(null);
    try {
      const { resendVerification } = await import("@/lib/api");
      const result = await resendVerification(unverifiedEmail);
      setResendStatus(result.message);
    } catch (err) {
      setResendStatus(
        err instanceof Error
          ? err.message
          : "Failed to resend verification email.",
      );
    } finally {
      setResending(false);
    }
  }

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/");
    }
  }, [router]);

  return (
    <div className="min-h-screen w-full relative flex flex-col items-center justify-center bg-background">
      {/* Background two-tone split */}
      <div className="absolute inset-0 z-0 flex flex-col pointer-events-none">
        <div className="h-[55%] bg-background relative">
          <svg
            className="absolute -bottom-1 w-full h-[15vh] text-primary"
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="currentColor"
              fillOpacity="0.3"
              d="M0,160L80,149.3C160,139,320,117,480,117.3C640,117,800,139,960,165.3C1120,192,1280,224,1360,240L1440,256L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"
            ></path>
            <path
              fill="currentColor"
              fillOpacity="0.6"
              d="M0,96L80,112C160,128,320,160,480,170.7C640,181,800,171,960,138.7C1120,107,1280,53,1360,26.7L1440,0L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"
            ></path>
            <path
              fill="currentColor"
              d="M0,224L80,213.3C160,203,320,181,480,181.3C640,181,800,203,960,197.3C1120,192,1280,160,1360,144L1440,128L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"
            ></path>
          </svg>
        </div>
        <div className="h-[45%] bg-gradient-to-b from-primary via-primary/60 to-primary/10"></div>
      </div>

      {/* Header Logo */}
      <div className="absolute top-0 left-0 p-8 z-10">
        <Link href="/">
          <LogoSplit className="h-10 w-auto" />
        </Link>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-[480px] z-10 px-4">
        <Card className="bg-card shadow-2xl border-0 rounded-2xl overflow-hidden">
          <CardHeader className="flex flex-col items-center pt-10 pb-6 px-10">
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center mb-5 shadow-lg shadow-primary/20">
              <Shield className="w-7 h-7 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground mb-2">
              Secure Admin Access
            </CardTitle>
            <CardDescription className="text-[13px] text-muted-foreground text-center">
              Enter your credentials to access the OfferlyIQ management portal
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-10 px-10">
            <form
              onSubmit={formik.handleSubmit}
              className="space-y-5"
              noValidate
            >
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-foreground">
                  Administrator Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    name="email"
                    value={formik.values.email}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    placeholder="admin@offerlyiq.com"
                    className="w-full h-11 border border-border/80 rounded-lg px-3.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors bg-background"
                  />
                  {formik.touched.email && formik.errors.email && (
                    <p className="text-red-500 text-[11px] mt-1 absolute -bottom-4 left-0">
                      {formik.errors.email}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-[13px] font-medium text-foreground">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formik.values.password}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    placeholder="••••••••••••"
                    className="w-full h-11 border border-border/80 rounded-lg px-3.5 pr-10 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors bg-background"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                  {formik.touched.password && formik.errors.password && (
                    <p className="text-red-500 text-[11px] mt-1 absolute -bottom-4 left-0">
                      {formik.errors.password}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 pb-1">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="text-[13px] text-muted-foreground font-medium select-none">
                    Remember me
                  </span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[13px] font-medium text-primary hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={formik.isSubmitting}
                  className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg shadow-md transition-all active:scale-[0.98]"
                >
                  {formik.isSubmitting
                    ? "Authenticating..."
                    : "Sign in to Dashboard"}
                </Button>
              </div>
            </form>

            {formik.status?.error && (
              <div className="mt-5">
                <FormAlert type="error" message={formik.status.error} center />
              </div>
            )}

            {unverifiedEmail && !resendStatus && (
              <div className="mt-5">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 rounded-lg"
                  disabled={resending}
                  onClick={handleResendVerification}
                >
                  {resending ? "Sending..." : "Resend verification email"}
                </Button>
              </div>
            )}

            {resendStatus && (
              <div className="mt-5">
                <FormAlert type="success" message={resendStatus} center />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
