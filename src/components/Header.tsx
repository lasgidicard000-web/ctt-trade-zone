import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Gift, ArrowLeftRight, Wallet, CreditCard, Trophy, MessageCircle, TrendingUp, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

const mainNavLinks = [
  { to: "/redeem", label: "Redeem", icon: Gift },
  { to: "/trade", label: "Trade", icon: ArrowLeftRight },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/crypto-cards", label: "Crypto Cards", icon: CreditCard },
];

const secondaryNavLinks = [
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/simulator", label: "Simulator", icon: TrendingUp },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      {mainNavLinks.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          onClick={onClick}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            isActive(link.to)
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <link.icon className="h-4 w-4" />
          {link.label}
        </Link>
      ))}
    </>
  );

  const SecondaryLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      {secondaryNavLinks.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          onClick={onClick}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            isActive(link.to)
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <link.icon className="h-4 w-4" />
          {link.label}
        </Link>
      ))}
    </>
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">C</span>
            </div>
            <span className="font-bold text-xl hidden sm:block">CryptoTrade</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            <NavLinks />
            <div className="w-px h-6 bg-border mx-2" />
            <SecondaryLinks />
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/auth" className="hidden sm:block">
              <Button variant="outline" size="sm" className="gap-2">
                <LogIn className="h-4 w-4" />
                Sign In
              </Button>
            </Link>

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="flex flex-col gap-6 mt-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
                      Main
                    </span>
                    <NavLinks onClick={() => setMobileMenuOpen(false)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
                      More
                    </span>
                    <SecondaryLinks onClick={() => setMobileMenuOpen(false)} />
                  </div>
                  <div className="pt-4 border-t border-border">
                    <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full gap-2">
                        <LogIn className="h-4 w-4" />
                        Sign In
                      </Button>
                    </Link>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
