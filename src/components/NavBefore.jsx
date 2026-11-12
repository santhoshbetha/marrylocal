import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Menu, UserPlus } from 'lucide-react';
import { Navbar } from '@/components/Navbar';

const linkClass =
  'rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground';

export function NavBefore() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const navigation = (
    <>
      <Link to="/" className={linkClass}>
        Home
      </Link>
      <Link to="/about" className={linkClass}>
        About
      </Link>
      <Link to="/contact" className={linkClass}>
        Contact
      </Link>
    </>
  );

  const actions = (
    <div className="hidden items-center gap-2 md:flex">
      <Button
        onClick={() => navigate('/login')}
        variant="ghost"
        size="sm"
        className="rounded-xl text-foreground hover:bg-accent hover:text-accent-foreground"
      >
        <LogIn className="mr-2 h-4 w-4" />
        Login
      </Button>
      <Button
        onClick={() => navigate('/register')}
        size="sm"
        className="rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90"
      >
        <UserPlus className="mr-2 h-4 w-4" />
        Register
      </Button>
    </div>
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
            to="/"
            className="rounded-xl px-4 py-3 text-lg font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            onClick={() => setIsOpen(false)}
          >
            Home
          </Link>
          <Link
            to="/about"
            className="rounded-xl px-4 py-3 text-lg font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            onClick={() => setIsOpen(false)}
          >
            About
          </Link>
          <Link
            to="/contact"
            className="rounded-xl px-4 py-3 text-lg font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            onClick={() => setIsOpen(false)}
          >
            Contact
          </Link>
          <div className="space-y-3 border-t border-border pt-6">
            <Button
              className="w-full rounded-xl bg-secondary text-secondary-foreground font-bold hover:bg-secondary/80"
              onClick={() => {
                setIsOpen(false);
                navigate('/login');
              }}
            >
              <LogIn className="mr-2 h-4 w-4" />
              Login
            </Button>
            <Button
              className="w-full rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90"
              onClick={() => {
                setIsOpen(false);
                navigate('/register');
              }}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Register
            </Button>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );

  return <Navbar navigation={navigation} actions={actions} mobileMenu={mobileMenu} brandTo="/" />;
}

export default NavBefore;
