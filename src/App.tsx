import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/redeem" element={<Redeem />} />
            <Route path="/redemption-history" element={<RedemptionHistory />} />
            <Route path="/trade" element={<Trade />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/simulator" element={<TradingSimulator />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/transactions" element={<TransactionHistory />} />
            <Route path="/admin/withdrawals" element={<AdminWithdrawals />} />
            <Route path="/crypto-cards" element={<CryptoCards />} />
            <Route path="/crypto-cards/nexo" element={<NexoCard />} />
            <Route path="/crypto-cards/gemini" element={<GeminiCard />} />
            <Route path="/crypto-cards/binance" element={<BinanceCard />} />
            <Route path="/crypto-cards/bybit" element={<BybitCard />} />
            <Route path="/crypto-cards/caltex" element={<CaltexCard />} />
            <Route path="/crypto-cards/crypto-com" element={<CryptoComCard />} />
            <Route path="/crypto-cards/mexc" element={<MexcCard />} />
            <Route path="/crypto-cards/coinbase" element={<CoinbaseCard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
