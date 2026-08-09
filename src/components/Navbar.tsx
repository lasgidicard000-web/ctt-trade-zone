import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/ctttradezone-logo.png.asset.json";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import {
  Shield,
  Menu,
  Wallet,
  Home,
  ArrowLeftRight,
  Gift,
  CreditCard,
  TrendingUp,
  Trophy,
  Gamepad2,
  MessageCircle,
  FileText,
  LogOut,
  LogIn,
  Mail,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  requireAuth?: boolean;
  requireAdmin?: boolean;
}

const navItems: NavItem[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/wallet", label: "Wallet", icon: Wallet, requireAuth: true },
  { to: "/trade", label: "Trade", icon: ArrowLeftRight, requireAuth: true },
  { to: "/redeem", label: "Redeem", icon: Gift },
  { to: "/investment-plans", label: "Plans", icon: TrendingUp },
  { to: "/crypto-cards", label: "Cards", icon: CreditCard },
  { to: "/transactions", label: "History", icon: FileText, requireAuth: true },
  { to: "/chat", label: "AI Advisor", icon: MessageCircle, requireAuth: true },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy, requireAuth: true },
  { to: "/simulator", label: "Simulator", icon: Gamepad2, requireAuth: true },
  { to: "/admin", label: "Admin", icon: Shield, requireAdmin: true },
  { to: "/admin/webmail", label: "Webmail", icon: Mail, requireAdmin: true },
];

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
    };

    checkAdmin();
  }, [user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const visibleItems = navItems.filter((item) => {
    if (item.requireAdmin) return isAdmin;
    if (item.requireAuth) return !!user;
    return true;
  });

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-foreground">
          <img
            src={logoAsset.url}
            alt="CTT Trade Zone"
            className="h-9 w-9 rounded-md object-cover ring-1 ring-primary/40"
          />
          <span className="hidden sm:inline tracking-tight">CTT Trade Zone</span>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {visibleItems.map((item) => (
            <Button
              key={item.to}
              variant={isActive(item.to) ? "secondary" : "ghost"}
              size="sm"
              asChild
              className={item.requireAdmin ? "text-accent hover:text-accent" : ""}
            >
              <Link to={item.to}>
                <item.icon className="mr-1.5 h-4 w-4" />
                {item.label}
              </Link>
            </Button>
          ))}
        </nav>

        {/* Desktop auth actions */}
        <div className="hidden lg:flex items-center gap-2">
          {user ? (
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-1.5 h-4 w-4" />
              Sign Out
            </Button>
          ) : (
            <Button variant="default" size="sm" asChild>
              <Link to="/auth">
                <LogIn className="mr-1.5 h-4 w-4" />
                Sign In
              </Link>
            </Button>
          )}
        </div>

        {/* Mobile menu */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px]">
            <div className="flex flex-col gap-2 py-4">
              {visibleItems.map((item) => (
                <SheetClose asChild key={item.to}>
                  <Button
                    variant={isActive(item.to) ? "secondary" : "ghost"}
                    className="justify-start"
                    asChild
                  >
                    <Link to={item.to}>
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.label}
                    </Link>
                  </Button>
                </SheetClose>
              ))}
              <div className="my-2 border-t border-border" />
              {user ? (
                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  className="justify-start"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              ) : (
                <Button variant="default" asChild className="justify-start">
                  <Link to="/auth">
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In
                  </Link>
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
