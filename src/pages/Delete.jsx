import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Spinner } from '@/components/ui/spinner';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useAuth } from '../store/authStore';
import { deleteUserAccount } from '../api/profiles';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Trash2, Shield } from 'lucide-react';

function Delete() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [confirmClick, setConfirmClick] = useState(false);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (!confirmClick || deleting) return;

    const deleteAccountMy = async () => {
      const res = await deleteUserAccount();
      if (res.success) {
        alert('Your account is deleted.');
        localStorage.removeItem('shortlistarray');
        localStorage.removeItem('shortlistarraylength');
        localStorage.removeItem('userstate');
        logout();
        window.location.href = '/';
      } else {
        setDeleting(false);
        setConfirmClick(false);
      }
      setDeleting(false);
      setConfirmClick(false);
    };

    if (confirmClick == true) {
      setDeleting(true);
      if (!isOnline) {
        alert('You are offline. check your internet connection.');
        setDeleting(false);
        setConfirmClick(false);
      } else {
        try {
          deleteAccountMy();
        } catch (error) {
          if (error?.response?.status == 429) {
            alert('Too many requests. try again after 2 minutes!');
          } else {
            alert('Something wrong. Try again later');
          }
        }
      }
    }
  }, [confirmClick, deleting, isOnline, logout]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4 max-w-4xl">
        <Card className="bg-card text-foreground border border-border/50 rounded-3xl shadow-sm overflow-hidden">
          {deleting && (
            <Spinner className="absolute top-[50%] left-[50%] z-50 cursor-pointer size-10" />
          )}
          <CardHeader className="px-6 py-8 border-b border-border/60 flex items-start justify-between bg-card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 text-destructive rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-2xl text-foreground">Delete Account</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Permanently remove your account and all associated data
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Warning Section */}
            <div className="bg-muted/40 border border-border/60 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-xl flex-shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-2">Before You Proceed</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• All your profile information will be permanently deleted</li>
                    <li>• Your photos and personal data will be removed</li>
                    <li>• You will lose access to all MarryLocal features</li>
                    <li>• This action cannot be undone</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Privacy Notice */}
            <div className="bg-muted/40 border border-border/60 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-xl flex-shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-2">Data Privacy</h3>
                  <p className="text-sm text-muted-foreground">
                    Your privacy is important to us. Account deletion will permanently remove all
                    your personal information from our servers in accordance with our privacy
                    policy.
                  </p>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="border-2 border-destructive/30 rounded-2xl p-6 bg-destructive/5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Danger Zone</h3>
                  <p className="text-muted-foreground text-sm">
                    Once you delete your account, there is no going back.
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="lg"
                      className="bg-destructive hover:bg-destructive/90 text-white px-6 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 w-full sm:w-auto"
                    >
                      <Trash2 className="w-5 h-5 mr-2" />
                      Delete My Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="sm:max-w-md bg-card text-foreground border border-border/60">
                    {deleting && (
                      <Spinner className="absolute top-[50%] left-[50%] z-50 cursor-pointer size-8" />
                    )}
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="w-5 h-5" />
                        Final Confirmation
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-left space-y-2 text-muted-foreground">
                        <p>
                          This action <strong>cannot be undone</strong>. This will permanently
                          delete your account and remove all your data from our servers.
                        </p>
                        <p className="font-medium text-foreground">
                          Are you absolutely sure you want to delete your account?
                        </p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-3">
                      <AlertDialogCancel disabled={deleting} className="px-4 py-2 border-border/60">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => setConfirmClick(true)}
                        disabled={deleting}
                        className="bg-destructive hover:bg-destructive/90 text-white px-4 py-2 font-semibold"
                      >
                        {deleting ? (
                          <>
                            <Spinner className="mr-2 size-4" />
                            Deleting...
                          </>
                        ) : (
                          'Yes, Delete My Account'
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {/* Alternative Actions */}
            <div className="bg-muted/40 border border-border/60 rounded-xl p-5">
              <h4 className="font-bold text-foreground mb-2">Need Help Instead?</h4>
              <p className="text-sm text-muted-foreground mb-3">
                If you're having issues or need to temporarily deactivate your account, consider
                these alternatives:
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border/60 text-foreground hover:bg-muted"
                  onClick={() => navigate('/contact')}
                >
                  Contact Support
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border/60 text-foreground hover:bg-muted"
                  onClick={() => navigate('/privacy')}
                >
                  Privacy Settings
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Delete;
