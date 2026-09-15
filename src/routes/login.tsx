import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
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

  return (
    <div className="flex min-h-screen justify-center bg-background px-7 pb-10 text-foreground">
      <div className="w-full max-w-sm pt-[110px]">
        <div className="grid size-[52px] place-items-center rounded-[16px] bg-primary text-white">
          <ArrowUp className="size-[26px]" strokeWidth={2.6} />
        </div>
        <h1 className="mt-[22px] font-display text-[36px] font-medium leading-[1.05] tracking-[-0.02em]">
          ProfitAI
        </h1>
        <p className="mt-2 text-[14px] text-muted-foreground">
          {mode === "signin" ? "Sign in to your resale ledger" : "Create your account"}
        </p>

        <Button
          type="button"
          variant="outline"
          className="mt-[34px] h-[50px] w-full gap-2.5 text-[14px]"
          disabled={busy}
          onClick={google}
        >
          <span
            aria-hidden
            className="size-[18px] rounded-full"
            style={{
              background: "conic-gradient(#ea4335 0 25%, #fbbc05 0 50%, #34a853 0 75%, #4285f4 0)",
            }}
          />
          Continue with Google
        </Button>

        <div className="my-[22px] flex items-center gap-3 text-[12px] font-semibold text-faint">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="h-12"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder="••••••••"
              className="h-12"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="mt-[22px] h-[50px] w-full" disabled={busy}>
            {mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-5 w-full text-center text-[13px] text-muted-foreground transition hover:text-foreground"
        >
          {mode === "signin"
            ? "Don't have an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
