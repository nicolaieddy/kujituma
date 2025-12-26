import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Share, Plus, MoreVertical, Check, Smartphone, ArrowLeft } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { Link } from 'react-router-dom';

const Install = () => {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWA();

  const handleInstall = async () => {
    await promptInstall();
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Already Installed!</CardTitle>
            <CardDescription>
              Kujituma is already installed on your device. Open it from your home screen for the best experience.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/">
              <Button className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go to App
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Smartphone className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Install Kujituma</CardTitle>
          <CardDescription>
            Install Kujituma on your device for quick access and a native app experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Benefits */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Why install?</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Quick access from your home screen
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Works offline with cached data
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Full-screen app experience
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Instant updates, no app store needed
              </li>
            </ul>
          </div>

          {/* Installation Instructions */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm">How to install</h3>
            
            {isInstallable ? (
              <Button onClick={handleInstall} className="w-full" size="lg">
                <Download className="h-5 w-5 mr-2" />
                Install Now
              </Button>
            ) : isIOS ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium mb-3">On iPhone/iPad:</p>
                  <ol className="space-y-3 text-sm text-muted-foreground">
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">1</span>
                      <span>Tap the <Share className="inline h-4 w-4 mx-1" /> Share button at the bottom of Safari</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">2</span>
                      <span>Scroll down and tap <Plus className="inline h-4 w-4 mx-1" /> "Add to Home Screen"</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">3</span>
                      <span>Tap "Add" in the top right corner</span>
                    </li>
                  </ol>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Note: Make sure you're using Safari browser
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium mb-3">On Android:</p>
                  <ol className="space-y-3 text-sm text-muted-foreground">
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">1</span>
                      <span>Tap the <MoreVertical className="inline h-4 w-4 mx-1" /> menu in Chrome</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">2</span>
                      <span>Tap "Install app" or "Add to Home Screen"</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">3</span>
                      <span>Tap "Install" to confirm</span>
                    </li>
                  </ol>
                </div>
              </div>
            )}
          </div>

          <Link to="/" className="block">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Continue in Browser
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default Install;
