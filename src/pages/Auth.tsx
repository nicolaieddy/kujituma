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

  const returnTo = useMemo(() => {
    const raw = new URLSearchParams(location.search).get('returnTo');
    if (!raw) return null;
    return raw.startsWith('/') ? raw : null;
  }, [location.search]);

  useEffect(() => {
    console.log('Auth page mounted, user:', user, 'loading:', loading, 'isNewUser:', isNewUser);
    if (user) {
      if (returnTo) {
        navigate(returnTo, { replace: true });
        return;
      }

      if (isNewUser) {
        console.log('New user detected, redirecting to profile');
        navigate('/profile');
      } else {
        console.log('User detected, redirecting to community');
        navigate('/community');
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

      // Only store ToS acceptance for new users signing up
      if (isNewUserFlow) {
        sessionStorage.setItem('tos_accepted_during_signup', CURRENT_TOS_VERSION);
      }

      await signInWithGoogle(returnTo ?? '/');
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
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-2xl sm:text-3xl font-bold text-foreground">
            Welcome to Kujituma
          </CardTitle>
          <p className="text-muted-foreground mt-3 text-sm sm:text-base">
            Sign in to track your goals and manage your progress
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-destructive text-sm leading-relaxed">{error}</p>
            </div>
          )}
          
          {/* Only show ToS checkbox for new user sign-up flow */}
          {isNewUserFlow && (
            <div className="flex items-start space-x-3 bg-muted/50 rounded-lg p-4">
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
                  className="underline hover:text-foreground transition-colors font-medium"
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a 
                  href="/privacy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground transition-colors font-medium"
                >
                  Privacy Policy
                </a>
              </Label>
            </div>
          )}

          <Button
            onClick={handleGoogleSignIn}
            disabled={signingIn || (isNewUserFlow && !tosAccepted)}
            className="w-full h-12 flex items-center justify-center space-x-3 text-base"
          >
            {signingIn ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </Button>

          {/* Toggle for new users who need to sign up */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsNewUserFlow(!isNewUserFlow)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              {isNewUserFlow ? "Already have an account? Sign in directly" : "New user? Sign up here"}
            </button>
          </div>

        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
