import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Smartphone, CheckCircle2, AlertCircle, Loader2, RefreshCcw } from "lucide-react";

type PhoneState = "idle" | "sending" | "code_sent" | "verifying" | "verified";

interface PhoneVerificationSectionProps {
  /** Called when phone is successfully verified, passes back the verified phone number */
  onVerified?: (phoneNumber: string) => void;
}

export function PhoneVerificationSection({ onVerified }: PhoneVerificationSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [phoneInput, setPhoneInput] = useState("");
  const [state, setState] = useState<PhoneState>("idle");
  const [otpValue, setOtpValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Current profile phone data
  const [currentPhone, setCurrentPhone] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("phone_number, phone_verified")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.phone_number) {
          setCurrentPhone(data.phone_number);
          setPhoneInput(data.phone_number);
          setIsVerified(!!data.phone_verified);
          if (data.phone_verified) setState("verified");
        }
        setLoadingProfile(false);
      });
  }, [user]);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const startResendCountdown = () => {
    setResendCountdown(30);
    countdownRef.current = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendCode = async () => {
    setError(null);
    const normalized = phoneInput.trim().replace(/\s/g, "");
    if (!normalized) {
      setError("Please enter your phone number.");
      return;
    }
    // Basic E.164 check
    if (!/^\+[1-9]\d{6,14}$/.test(normalized)) {
      setError("Use E.164 format, e.g. +12025551234 (country code + number, no spaces).");
      return;
    }

    setState("sending");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`,
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ phone_number: normalized }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Failed to send code.");
        setState(currentPhone && isVerified ? "verified" : "idle");
        return;
      }

      setState("code_sent");
      setOtpValue("");
      startResendCountdown();
      toast({ title: "Code sent!", description: `A 6-digit code was sent to ${normalized}.` });
    } catch {
      setError("Network error. Please try again.");
      setState(currentPhone && isVerified ? "verified" : "idle");
    }
  };

  const handleVerify = async () => {
    if (otpValue.length !== 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }
    setError(null);
    setState("verifying");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`,
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ code: otpValue }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Verification failed.");
        setState("code_sent");
        return;
      }

      setState("verified");
      setCurrentPhone(result.phone_number || phoneInput.trim());
      setIsVerified(true);
      toast({ title: "Phone verified! ✅", description: "SMS notifications are now enabled." });
      onVerified?.(result.phone_number || phoneInput.trim());
    } catch {
      setError("Network error. Please try again.");
      setState("code_sent");
    }
  };

  const handleChangeNumber = () => {
    setState("idle");
    setIsVerified(false);
    setOtpValue("");
    setError(null);
  };

  if (loadingProfile) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6 flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading phone settings…</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card shadow-elegant">
      <CardHeader className="pb-3 pt-5 px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold text-foreground">
              Phone Number for SMS
            </CardTitle>
          </div>
          {state === "verified" && (
            <Badge variant="default" className="text-xs font-medium">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          )}
          {currentPhone && !isVerified && state !== "code_sent" && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              <AlertCircle className="h-3 w-3 mr-1" />
              Not verified
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Verify your phone number to receive SMS notifications for important events.
        </p>
      </CardHeader>

      <CardContent className="px-6 pb-5 space-y-4">
        {/* Phone input row */}
        {(state === "idle" || state === "sending" || state === "verified") && (
          <div className="space-y-2">
            <Label htmlFor="phone-input" className="text-sm">
              Phone Number <span className="text-muted-foreground font-normal">(E.164 format, e.g. +12025551234)</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="phone-input"
                type="tel"
                placeholder="+12025551234"
                value={phoneInput}
                onChange={(e) => {
                  setPhoneInput(e.target.value);
                  setError(null);
                }}
                disabled={state === "sending" || state === "verified"}
                className="flex-1"
              />
              {state === "verified" ? (
                <Button variant="outline" size="sm" onClick={handleChangeNumber} className="shrink-0">
                  Change
                </Button>
              ) : (
                <Button
                  onClick={handleSendCode}
                  disabled={state === "sending" || !phoneInput.trim()}
                  size="sm"
                  className="shrink-0"
                >
                  {state === "sending" ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Sending…</>
                  ) : (
                    "Send Code"
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* OTP entry section */}
        {(state === "code_sent" || state === "verifying") && (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Enter the 6-digit code sent to{" "}
                <span className="font-semibold">{phoneInput.trim()}</span>
              </p>
              <p className="text-xs text-muted-foreground">Code expires in 10 minutes.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <InputOTP
                maxLength={6}
                value={otpValue}
                onChange={setOtpValue}
                disabled={state === "verifying"}
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>

              <Button
                onClick={handleVerify}
                disabled={otpValue.length !== 6 || state === "verifying"}
                size="sm"
              >
                {state === "verifying" ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Verifying…</>
                ) : (
                  "Verify"
                )}
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setState("idle");
                  setOtpValue("");
                  setError(null);
                }}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Change number
              </button>
              <span className="text-muted-foreground">·</span>
              {resendCountdown > 0 ? (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <RefreshCcw className="h-3 w-3" />
                  Resend in {resendCountdown}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={state === "verifying"}
                  className="text-xs text-primary hover:underline flex items-center gap-1 disabled:opacity-50"
                >
                  <RefreshCcw className="h-3 w-3" />
                  Resend code
                </button>
              )}
            </div>
          </div>
        )}

        {/* Verified state - number display */}
        {state === "verified" && currentPhone && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            <p className="text-sm text-primary/90">
              <span className="font-semibold">{currentPhone}</span> is verified. SMS notifications are active.
            </p>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
