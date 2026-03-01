import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { CURRENT_TOS_VERSION } from '@/constants/tosVersion';

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signInWithGoogle, loading, isNewUser } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tosAccepted, setTosAccepted] = useState(false);
  const [isNewUserFlow, setIsNewUserFlow] = useState(false);

  const { returnTo, initialSignupMode } = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const raw = params.get('returnTo');
    const mode = params.get('mode');
    return {
      returnTo: raw && raw.startsWith('/') ? raw : null,
      initialSignupMode: mode === 'signup'
    };
  }, [location.search]);

  // Auto-set signup mode if coming from "Get Started"
  useEffect(() => {
    if (initialSignupMode) {
      setIsNewUserFlow(true);
    }
  }, [initialSignupMode]);

  useEffect(() => {
    console.log('Auth page mounted, user:', user, 'loading:', loading, 'isNewUser:', isNewUser);
    if (user) {
      if (returnTo) {
        navigate(returnTo, { replace: true });
        return;
      }

      if (isNewUser) {
        console.log('New user detected, redirecting to onboarding');
        navigate('/onboarding', { replace: true });
      } else {
        console.log('Returning user, redirecting to goals');
        navigate('/goals?tab=longterm', { replace: true });
      }
    }
  }, [user, isNewUser, navigate, loading, returnTo]);

  const handleGoogleSignIn = async () => {
    // For new user sign-up flow, require ToS acceptance
    if (isNewUserFlow && !tosAccepted) {
      setError('Please accept the Terms of Service and Privacy Policy to continue');
      return;
    }

    try {
      console.log('Starting Google sign in...');
      setSigningIn(true);
      setError(null);

      // For new user sign-up flow, store flag so TosGate knows to skip the modal
      if (isNewUserFlow) {
        sessionStorage.setItem('tos_accepted_during_signup', CURRENT_TOS_VERSION);
        sessionStorage.setItem('is_new_signup', 'true');
      }

      // Redirect destination: new users will go to /onboarding, returning users to /goals
      await signInWithGoogle(returnTo ?? '/goals?tab=longterm');
    } catch (error) {
      console.error('Sign in error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred during sign in');
      setSigningIn(false);
      sessionStorage.removeItem('tos_accepted_during_signup');
    }
  };
  
  // Handle ToS acceptance after OAuth redirect
  useEffect(() => {
    const recordTosAcceptance = async () => {
      const tosVersion = sessionStorage.getItem('tos_accepted_during_signup');
      if (user && tosVersion) {
        sessionStorage.removeItem('tos_accepted_during_signup');
        try {
          await (supabase
            .from('tos_acceptances' as any)
            .insert({
              user_id: user.id,
              tos_version: tosVersion,
              user_agent: navigator.userAgent
            }) as unknown as Promise<{ error: any }>);
        } catch (error) {
          console.error('Error recording ToS acceptance:', error);
        }
      }
    };
    
    recordTosAcceptance();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center pb-6">
            <Skeleton className="h-8 w-48 mx-auto mb-3" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl sm:text-3xl font-bold text-foreground">
            {isNewUserFlow ? "Create Your Account" : "Welcome Back"}
          </CardTitle>
          <p className="text-muted-foreground mt-3 text-sm sm:text-base">
            {isNewUserFlow 
              ? "Join Kujituma to track your goals and build lasting habits"
              : "Sign in to track your goals and manage your progress"
            }
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {error && (
            <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-destructive text-sm leading-relaxed">{error}</p>
            </div>
          )}
          
          {/* Sign-up flow with ToS */}
          {isNewUserFlow ? (
            <div className="space-y-5">
              <div className="flex items-start space-x-3 rounded-lg border border-border p-4 bg-muted/30">
                <Checkbox
                  id="accept-tos"
                  checked={tosAccepted}
                  onCheckedChange={(checked) => setTosAccepted(checked === true)}
                  disabled={signingIn}
                  className="mt-0.5"
                />
                <Label 
                  htmlFor="accept-tos" 
                  className="text-sm leading-relaxed cursor-pointer"
                >
                  I agree to the{" "}
                  <a 
                    href="/terms" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary underline hover:text-primary/80 transition-colors font-medium"
                  >
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a 
                    href="/privacy" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary underline hover:text-primary/80 transition-colors font-medium"
                  >
                    Privacy Policy
                  </a>
                </Label>
              </div>

              <button
                onClick={handleGoogleSignIn}
                disabled={signingIn || !tosAccepted}
                className="w-full h-10 flex items-center justify-center gap-3 rounded-[20px] border border-[hsl(210,2%,47%)] bg-white hover:bg-[hsl(0,0%,95%)] disabled:opacity-50 disabled:pointer-events-none transition-colors"
                style={{ fontFamily: "'Roboto', arial, sans-serif", fontWeight: 500, fontSize: 14, color: '#1f1f1f' }}
              >
                {signingIn ? (
                  <Loader2 className="h-5 w-5 animate-spin text-[hsl(210,2%,47%)]" />
                ) : (
                  <>
                    <svg className="h-5 w-5" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.04 24.04 0 0 0 0 21.56l7.98-6.19z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                      <path fill="none" d="M0 0h48v48H0z"/>
                    </svg>
                    <span>Sign up with Google</span>
                  </>
                )}
              </button>
              
              <p className="text-xs text-center text-muted-foreground">
                By signing up, you're creating a Kujituma account
              </p>
            </div>
          ) : (
            /* Sign-in flow - no ToS checkbox needed */
            <button
              onClick={handleGoogleSignIn}
              disabled={signingIn}
              className="w-full h-10 flex items-center justify-center gap-3 rounded-[20px] border border-[hsl(210,2%,47%)] bg-white hover:bg-[hsl(0,0%,95%)] disabled:opacity-50 disabled:pointer-events-none transition-colors"
              style={{ fontFamily: "'Roboto', arial, sans-serif", fontWeight: 500, fontSize: 14, color: '#1f1f1f' }}
            >
              {signingIn ? (
                <Loader2 className="h-5 w-5 animate-spin text-[hsl(210,2%,47%)]" />
              ) : (
                <>
                  <svg className="h-5 w-5" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.04 24.04 0 0 0 0 21.56l7.98-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    <path fill="none" d="M0 0h48v48H0z"/>
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>
          )}

          {/* Toggle between sign-in and sign-up */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsNewUserFlow(!isNewUserFlow);
              setError(null);
            }}
            className="w-full text-center py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isNewUserFlow ? "Sign in instead" : "Create an account"}
          </button>

        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
