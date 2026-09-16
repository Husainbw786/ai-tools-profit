import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff, Lock, Mail, Shield, User, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LoginShowcase } from "@/components/LoginShowcase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Sign in — ProfitAI" }],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/" });
  },
  component: LoginPage,
});

/**
 * Split login screen. From `md` up the pitch and the form sit side by side;
 * below it the pitch is the page and the form slides up as a bottom sheet.
 * The breakpoint is pure CSS so the server and the first client render agree.
 */
function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  // Only consulted below `md`; on wider screens the form is always on screen.
  const [sheetOpen, setSheetOpen] = useState(false);

  const isSignup = mode === "signup";

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheetOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  const open = (next: "signin" | "signup") => {
    setMode(next);
    setSheetOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: name.trim() ? { full_name: name.trim() } : undefined,
          },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    // Uses Supabase's own Google provider. Enable it under
    // Authentication > Providers in the Supabase dashboard and add the
    // deployed site URL to the allowed redirect URLs.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) {
      setBusy(false);
      toast.error(error.message || "Google sign-in failed");
    }
  };

  const forgot = async () => {
    if (!email.trim()) {
      toast.error("Enter your email first, then tap Forgot.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/login`,
    });
    setBusy(false);
    if (error) toast.error(error.message || "Could not send the reset link");
    else toast.success("Password reset link sent. Check your email.");
  };

  return (
    <div className="relative flex min-h-screen flex-wrap items-stretch">
      <LoginShowcase
        onSignIn={() => open("signin")}
        onSignUp={() => open("signup")}
        ctasHidden={sheetOpen}
      />

      <div
        className={cn(
          // Mobile: a bottom sheet above the pitch.
          "fixed inset-x-0 bottom-0 z-20 max-h-[92vh] justify-center overflow-y-auto rounded-t-[28px] bg-background px-6 pb-8 pt-7 shadow-[0_-12px_40px_rgba(41,38,27,0.2)] animate-[sheet-up_0.24s_ease-out]",
          // Desktop: the second column of the split, always visible.
          "md:static md:order-2 md:flex md:max-h-none md:flex-1 md:basis-[360px] md:animate-none md:items-center md:overflow-visible md:rounded-none md:px-6 md:py-12 md:shadow-none",
          sheetOpen ? "flex" : "hidden md:flex",
        )}
      >
        <div className="relative w-full max-w-[400px]">
          <button
            type="button"
            onClick={() => setSheetOpen(false)}
            aria-label="Close"
            className="absolute -top-1.5 right-0 grid size-8 place-items-center rounded-full bg-secondary text-muted-foreground transition hover:text-foreground md:hidden"
          >
            <X className="size-3.5" strokeWidth={2.4} />
          </button>

          <h1 className="font-display text-[32px] font-medium leading-[1.1] tracking-[-0.02em]">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-2 text-[14px] text-muted-foreground">
            {isSignup
              ? "Start tracking sales in under a minute."
              : "Sign in to your resale ledger."}
          </p>

          <Button
            type="button"
            variant="outline"
            className="mt-[30px] h-[50px] w-full gap-2.5 bg-card text-[14px] hover:bg-card/70"
            disabled={busy}
            onClick={google}
          >
            <GoogleMark />
            Continue with Google
          </Button>

          <div className="my-[22px] flex items-center gap-3 text-[12px] font-semibold text-faint">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit}>
            {isSignup && (
              <div className="mb-4">
                <Label htmlFor="name">Name</Label>
                <Field icon={User}>
                  <Input
                    id="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Your name"
                    className="h-12 bg-card pl-[42px]"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Field>
              </div>
            )}

            <Label htmlFor="email">Email</Label>
            <Field icon={Mail}>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="h-12 bg-card pl-[42px]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>

            <div className="mt-4 flex items-baseline justify-between">
              <Label htmlFor="password">Password</Label>
              {!isSignup && (
                <button
                  type="button"
                  onClick={forgot}
                  disabled={busy}
                  className="text-[12px] font-semibold text-accent-text transition hover:underline disabled:opacity-50"
                >
                  Forgot?
                </button>
              )}
            </div>
            <Field icon={Lock}>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                autoComplete={isSignup ? "new-password" : "current-password"}
                placeholder="••••••••"
                className="h-12 bg-card pl-[42px] pr-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-3 grid size-6 place-items-center text-faint transition hover:text-muted-foreground"
              >
                {showPassword ? (
                  <EyeOff className="size-[18px]" strokeWidth={2} />
                ) : (
                  <Eye className="size-[18px]" strokeWidth={2} />
                )}
              </button>
            </Field>

            <Button type="submit" className="mt-[22px] h-[50px] w-full gap-2" disabled={busy}>
              {isSignup ? "Create account" : "Sign in"}
              <ArrowRight className="size-4" strokeWidth={2.5} />
            </Button>
          </form>

          <p className="mt-5 text-center text-[13px] text-muted-foreground">
            {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={() => setMode(isSignup ? "signin" : "signup")}
              className="font-bold text-accent-text transition hover:underline"
            >
              {isSignup ? "Sign in" : "Sign up"}
            </button>
          </p>

          <p className="mt-[34px] flex items-center justify-center gap-2 text-center text-[12px] font-semibold text-faint">
            <Shield className="size-3.5 shrink-0" strokeWidth={2} />
            Your ledger is private. Only you can see your sales.
          </p>
        </div>
      </div>

      {sheetOpen && (
        <div
          onClick={() => setSheetOpen(false)}
          className="fixed inset-0 z-[19] bg-[rgba(41,38,27,0.35)] md:hidden"
        />
      )}
    </div>
  );
}

/** Input wrapper that parks a 18px icon in the left gutter. */
function Field({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  children: React.ReactNode;
}) {
  return (
    <div className="relative mt-1.5">
      <Icon className="pointer-events-none absolute left-3.5 top-[15px] size-[18px] text-faint" />
      {children}
    </div>
  );
}

/** Google's four-colour mark; lucide has no brand icons. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-[18px]">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.9 1.5l2.6-2.6C16.9 3.1 14.7 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.7H12z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.6c-.9.6-2 1-3.4 1-2.6 0-4.9-1.8-5.7-4.2H3v2.7C4.7 19.8 8 22 12 22z"
      />
      <path
        fill="#4A90E2"
        d="M21.6 12.2c0-.7-.1-1.2-.2-1.7H12v3.9h5.5c-.3 1.4-1.1 2.4-2.1 3.1l3.2 2.6c1.9-1.8 3-4.4 3-7.9z"
      />
      <path
        fill="#FBBC05"
        d="M6.3 14.3c-.2-.7-.3-1.5-.3-2.3s.1-1.6.3-2.3V7H3C2.4 8.5 2 10.2 2 12s.4 3.5 1 5l3.3-2.7z"
      />
    </svg>
  );
}
