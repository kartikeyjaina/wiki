import { LockKeyhole, Mail, UserRound } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { env, isValidDomain } from "@/lib/env";
import { supabase } from "@/lib/supabase";

export function Login() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!supabase) {
      setError("Configure your real Supabase project values before enabling sign-in.");
      return;
    }

    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password.trim()) {
      setError("Enter an email and password.");
      return;
    }

    if (!normalizedEmail.includes("@") || !normalizedEmail.split("@", 2)[1]) {
      setError("Use a valid email address.");
      return;
    }

    if (env.allowedDomains.length && !isValidDomain(normalizedEmail)) {
      setError(`Only ${env.allowedDomains.join(", ")} email addresses are allowed.`);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: name.trim() || normalizedEmail.split("@", 2)[0],
            },
          },
        });

        if (signUpError) throw signUpError;

        if (data.user && !data.session) {
          setMessage("Account created. Check your email to confirm before signing in.");
        } else {
          setMessage("Account created. You can sign in now.");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (signInError) throw signInError;
        setMessage("Signed in successfully.");
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-white px-6">
      <section className="w-full max-w-md rounded-xl border border-border bg-white p-8 shadow-soft">
        <p className="font-display text-xl font-bold tracking-[-0.03em]">futurelab<span className="font-medium text-muted"> wiki</span></p>
        <h1 className="mt-10 font-display text-4xl font-bold tracking-[-0.03em]">{mode === "login" ? "Sign in to continue." : "Create your account."}</h1>
        <p className="mt-4 text-sm leading-6 text-muted">
          This internal workspace uses Supabase Email auth and accepts authorized Futurelab domains. The allowlist is configured with <strong>{env.allowedDomains.join(", ") || "your domains"}</strong> and is enforced by the database trigger and RLS.
        </p>
        <div className="mt-6 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted">
          Domain check: <span className="font-semibold text-foreground">{isValidDomain("member@futurelab.com") ? "enabled" : "not configured"}</span>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="mt-8 space-y-4">
          {mode === "signup" ? (
            <label className="block text-sm font-medium text-foreground">
              <span className="mb-2 flex items-center gap-2"><UserRound className="h-4 w-4" /> Full name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} className="h-12 w-full rounded-md border border-border px-4 outline-none focus:border-foreground" placeholder="Ada Lovelace" />
            </label>
          ) : null}

          <label className="block text-sm font-medium text-foreground">
            <span className="mb-2 flex items-center gap-2"><Mail className="h-4 w-4" /> Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 w-full rounded-md border border-border px-4 outline-none focus:border-foreground" placeholder="name@futurelab.com" />
          </label>

          <label className="block text-sm font-medium text-foreground">
            <span className="mb-2 flex items-center gap-2"><LockKeyhole className="h-4 w-4" /> Password</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 w-full rounded-md border border-border px-4 outline-none focus:border-foreground" placeholder="Enter a secure password" />
          </label>

          {error ? <p className="rounded-md bg-[#fad9db] px-4 py-3 text-sm font-medium" role="alert">{error}</p> : null}
          {message ? <p className="rounded-md bg-[#ccf0dc] px-4 py-3 text-sm font-medium">{message}</p> : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <button type="button" className="mt-5 w-full text-center text-sm font-semibold text-muted" onClick={() => setMode((current) => (current === "login" ? "signup" : "login"))}>
          {mode === "login" ? "Need an account? Create one" : "Already have an account? Sign in"}
        </button>
      </section>
    </main>
  );
}
