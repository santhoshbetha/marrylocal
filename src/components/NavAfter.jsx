import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/store/authStore';
import { useAuthActions } from '@/hooks/useAuthActions';
import {
  Bookmark,
  Home,
  Key,
  Loader2,
  LogOut,
  Menu,
  MessageCircle,
  Search,
  Settings,
  User,
  Users,
} from 'lucide-react';

const navLinkClass =
  'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground';

export function NavAfter({ hideLogout = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { profiledata } = useAuth();
  const { handleLogout, isLoggingOut } = useAuthActions();

  const getInitials = () => {
    if (profiledata?.firstname && profiledata?.lastname) {
      return `${profiledata.firstname[0]}${profiledata.lastname[0]}`.toUpperCase();
    }
    return 'U';
  };

  const homePath = profiledata?.role === 'admin' ? '/admin' : '/myspace';

  const navigation = (
    <>
      <Link to={homePath} className={navLinkClass}>
        <Home className="h-4 w-4" />
        <span>Home</span>
      </Link>
      <Link to="/about" className={navLinkClass}>
        <Users className="h-4 w-4" />
        <span>About</span>
      </Link>
      {profiledata?.role !== 'admin' && (
        <Link to="/dashboard/search-user" className={navLinkClass}>
          <Search className="h-4 w-4" />
          <span>Search</span>
        </Link>
      )}
      <Link to="/contact" className={navLinkClass}>
        <MessageCircle className="h-4 w-4" />
        <span>Contact</span>
      </Link>
      {profiledata?.role !== 'admin' && (
        <Link to="/referrals" className={navLinkClass}>
          <Users className="h-4 w-4" />
          <span>Referrals</span>
        </Link>
      )}
    </>
  );

  const actions = (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 rounded-full transition-colors hover:bg-accent"
        >
          <Avatar className="h-9 w-9 border border-border">
            <AvatarImage src="/placeholder-user.jpg" alt="@shadcn" />
            <AvatarFallback className="bg-secondary text-secondary-foreground font-semibold">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <span className="sr-only">Toggle user menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="mr-4 w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none text-foreground">
              {profiledata?.firstname} {profiledata?.lastname}
            </p>
            <p className="text-xs leading-none text-muted-foreground">{profiledata?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {profiledata?.role !== 'admin' && (
          <DropdownMenuItem onSelect={() => navigate('/profile')} className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
        )}
        {profiledata?.role !== 'admin' && (
          <DropdownMenuItem
            onSelect={() => navigate('/dashboard/shortlist')}
            className="cursor-pointer"
          >
            <Bookmark className="mr-2 h-4 w-4" />
            <span>Shortlist & Likes</span>
          </DropdownMenuItem>
        )}
        {profiledata?.role !== 'admin' && (
          <DropdownMenuItem onSelect={() => navigate('/settings')} className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => navigate('/forgotpassword')} className="cursor-pointer">
          <Key className="mr-2 h-4 w-4" />
          <span>Change Password</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('/delete')} className="cursor-pointer">
          <User className="mr-2 h-4 w-4" />
          <span>Delete Account</span>
        </DropdownMenuItem>
        {!hideLogout && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => handleLogout()}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const mobileMenu = (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild className="md:hidden">
        <Button
          variant="ghost"
          size="sm"
          className="rounded-xl text-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[300px] border-l border-border bg-card text-card-foreground sm:w-[400px]"
      >
        <SheetHeader>
          <SheetTitle className="text-card-foreground">MarryLocal</SheetTitle>
        </SheetHeader>
        <nav className="mt-8 flex flex-col space-y-2">
          <Link
            to={homePath}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-lg font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            onClick={() => setIsOpen(false)}
          >
            <Home className="h-5 w-5" />
            Home
          </Link>
          <Link
            to="/about"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-lg font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            onClick={() => setIsOpen(false)}
          >
            <Users className="h-5 w-5" />
            About
          </Link>
          <Link
            to="/dashboard/search-user"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-lg font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            onClick={() => setIsOpen(false)}
          >
            <Search className="h-5 w-5" />
            Search
          </Link>
          <Link
            to="/contact"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-lg font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            onClick={() => setIsOpen(false)}
          >
            <MessageCircle className="h-5 w-5" />
            Contact
          </Link>
          <Link
            to="/referrals"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-lg font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            onClick={() => setIsOpen(false)}
          >
            <Users className="h-5 w-5" />
            Referrals
          </Link>

          <div className="space-y-2 border-t border-border pt-6">
            <Button
              variant="ghost"
              className="w-full justify-start rounded-xl text-foreground hover:bg-accent"
              onClick={() => {
                setIsOpen(false);
                navigate('/profile');
              }}
            >
              <User className="mr-2 h-4 w-4" />
              Profile
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start rounded-xl text-foreground hover:bg-accent"
              onClick={() => {
                setIsOpen(false);
                navigate('/dashboard/shortlist');
              }}
            >
              <Bookmark className="mr-2 h-4 w-4" />
              Shortlist & Likes
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start rounded-xl text-foreground hover:bg-accent"
              onClick={() => {
                setIsOpen(false);
                navigate('/settings');
              }}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start rounded-xl text-foreground hover:bg-accent"
              onClick={() => {
                setIsOpen(false);
                navigate('/forgotpassword');
              }}
            >
              <Key className="mr-2 h-4 w-4" />
              Change Password
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start rounded-xl text-foreground hover:bg-accent"
              onClick={() => {
                setIsOpen(false);
                navigate('/delete');
              }}
            >
              <User className="mr-2 h-4 w-4" />
              Delete Account
            </Button>
            {!hideLogout && (
              <Button
                variant="ghost"
                className="w-full justify-start rounded-xl text-destructive hover:bg-destructive/10"
                disabled={isLoggingOut}
                onClick={() => {
                  setIsOpen(false);
                  handleLogout();
                }}
              >
                {isLoggingOut ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="mr-2 h-4 w-4" />
                )}
                {isLoggingOut ? 'Logging out...' : 'Log out'}
              </Button>
            )}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );

  return (
    <Navbar navigation={navigation} actions={actions} mobileMenu={mobileMenu} brandTo={homePath} />
  );
}

export default NavAfter;
