import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import Redeem from "./pages/Redeem";
import RedemptionHistory from "./pages/RedemptionHistory";
import Trade from "./pages/Trade";
import Wallet from "./pages/Wallet";
import Chat from "./pages/Chat";
import TradingSimulator from "./pages/TradingSimulator";
import Leaderboard from "./pages/Leaderboard";
import TransactionHistory from "./pages/TransactionHistory";
import AdminWithdrawals from "./pages/AdminWithdrawals";
import AdminRedemptions from "./pages/AdminRedemptions";
import NotFound from "./pages/NotFound";
import CryptoCards from "./pages/CryptoCards";
import NexoCard from "./pages/crypto-cards/NexoCard";
import GeminiCard from "./pages/crypto-cards/GeminiCard";
import BinanceCard from "./pages/crypto-cards/BinanceCard";
import BybitCard from "./pages/crypto-cards/BybitCard";
import CaltexCard from "./pages/crypto-cards/CaltexCard";
import CryptoComCard from "./pages/crypto-cards/CryptoComCard";
import MexcCard from "./pages/crypto-cards/MexcCard";
import CoinbaseCard from "./pages/crypto-cards/CoinbaseCard";
import SpendCard from "./pages/SpendCard";
import InvestmentPlans from "./pages/InvestmentPlans";
import AdminPlans from "./pages/AdminPlans";
import AdminRoiAudit from "./pages/AdminRoiAudit";
import OAuthConsent from "./pages/OAuthConsent";
import AdminWebmail from "./pages/AdminWebmail";
import AdminCloud from "./pages/AdminCloud";
import Unsubscribe from "./pages/Unsubscribe";
import ReplyToMessage from "./pages/ReplyToMessage";
import Downloads from "./pages/Downloads";
import DemoTrading from "./pages/DemoTrading";
import TradingBots from "./pages/TradingBots";
import LiveTrading from "./pages/LiveTrading";



const queryClient = new QueryClient();

const Layout = () => (
  <>
    <Navbar />
    <Outlet />
  </>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/redeem" element={<Redeem />} />
            <Route path="/redemption-history" element={<RedemptionHistory />} />
            <Route path="/trade" element={<Trade />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/simulator" element={<TradingSimulator />} />
            <Route path="/demo-trading" element={<DemoTrading />} />
            <Route path="/live-trading" element={<LiveTrading />} />
            <Route path="/trading-bots" element={<TradingBots />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/transactions" element={<TransactionHistory />} />
            <Route path="/admin/withdrawals" element={<AdminWithdrawals />} />
            <Route path="/admin/redemptions" element={<AdminRedemptions />} />
            <Route path="/crypto-cards" element={<CryptoCards />} />
            <Route path="/crypto-cards/nexo" element={<NexoCard />} />
            <Route path="/crypto-cards/gemini" element={<GeminiCard />} />
            <Route path="/crypto-cards/binance" element={<BinanceCard />} />
            <Route path="/crypto-cards/bybit" element={<BybitCard />} />
            <Route path="/crypto-cards/caltex" element={<CaltexCard />} />
            <Route path="/crypto-cards/crypto-com" element={<CryptoComCard />} />
            <Route path="/crypto-cards/mexc" element={<MexcCard />} />
            <Route path="/crypto-cards/coinbase" element={<CoinbaseCard />} />
            <Route path="/spend-card" element={<SpendCard />} />
            <Route path="/investment-plans" element={<InvestmentPlans />} />
            <Route path="/admin/plans" element={<AdminPlans />} />
            <Route path="/admin/roi-audit" element={<AdminRoiAudit />} />
            <Route path="/admin/webmail" element={<AdminWebmail />} />
            <Route path="/admin/cloud" element={<AdminCloud />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/reply/:token" element={<ReplyToMessage />} />
            <Route path="/downloads" element={<Downloads />} />


            <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
