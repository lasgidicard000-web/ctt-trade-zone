import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Building, Globe, ArrowRightLeft, Landmark } from "lucide-react";

interface BankInfo {
  name: string;
}

interface CountryBanks {
  country: string;
  currency: string;
  currencyCode: string;
  flag: string;
  banks: BankInfo[];
}

const globalBanks: CountryBanks[] = [
  {
    country: "Australia",
    currency: "Australian Dollar",
    currencyCode: "AUD",
    flag: "🇦🇺",
    banks: [
      { name: "Commonwealth Bank of Australia (CBA)" },
      { name: "Westpac Banking Corporation" },
      { name: "Australia and New Zealand Banking Group (ANZ)" },
      { name: "National Australia Bank (NAB)" },
      { name: "Macquarie Bank" },
    ],
  },
  {
    country: "United States",
    currency: "US Dollar",
    currencyCode: "USD",
    flag: "🇺🇸",
    banks: [
      { name: "JPMorgan Chase Bank" },
      { name: "Bank of America" },
      { name: "Wells Fargo" },
      { name: "Citibank" },
      { name: "U.S. Bank" },
    ],
  },
  {
    country: "United Kingdom",
    currency: "British Pound",
    currencyCode: "GBP",
    flag: "🇬🇧",
    banks: [
      { name: "HSBC UK" },
      { name: "Barclays Bank" },
      { name: "Lloyds Banking Group" },
      { name: "NatWest Group" },
      { name: "Standard Chartered" },
    ],
  },
  {
    country: "Canada",
    currency: "Canadian Dollar",
    currencyCode: "CAD",
    flag: "🇨🇦",
    banks: [
      { name: "Royal Bank of Canada (RBC)" },
      { name: "Toronto-Dominion Bank (TD)" },
      { name: "Bank of Montreal (BMO)" },
      { name: "Bank of Nova Scotia (Scotiabank)" },
      { name: "Canadian Imperial Bank of Commerce (CIBC)" },
    ],
  },
  {
    country: "European Union",
    currency: "Euro",
    currencyCode: "EUR",
    flag: "🇪🇺",
    banks: [
      { name: "Deutsche Bank (Germany)" },
      { name: "BNP Paribas (France)" },
      { name: "ING Group (Netherlands)" },
      { name: "Santander (Spain)" },
      { name: "UniCredit (Italy)" },
    ],
  },
  {
    country: "Nigeria",
    currency: "Nigerian Naira",
    currencyCode: "NGN",
    flag: "🇳🇬",
    banks: [
      { name: "First Bank of Nigeria" },
      { name: "Zenith Bank" },
      { name: "Guaranty Trust Bank (GTBank)" },
      { name: "Access Bank" },
      { name: "United Bank for Africa (UBA)" },
    ],
  },
  {
    country: "South Africa",
    currency: "South African Rand",
    currencyCode: "ZAR",
    flag: "🇿🇦",
    banks: [
      { name: "Standard Bank" },
      { name: "FirstRand Bank" },
      { name: "Absa Group" },
      { name: "Nedbank" },
      { name: "Capitec Bank" },
    ],
  },
  {
    country: "India",
    currency: "Indian Rupee",
    currencyCode: "INR",
    flag: "🇮🇳",
    banks: [
      { name: "State Bank of India" },
      { name: "HDFC Bank" },
      { name: "ICICI Bank" },
      { name: "Axis Bank" },
      { name: "Punjab National Bank" },
    ],
  },
  {
    country: "Singapore",
    currency: "Singapore Dollar",
    currencyCode: "SGD",
    flag: "🇸🇬",
    banks: [
      { name: "DBS Bank" },
      { name: "OCBC Bank" },
      { name: "United Overseas Bank (UOB)" },
      { name: "Standard Chartered Singapore" },
      { name: "HSBC Singapore" },
    ],
  },
  {
    country: "United Arab Emirates",
    currency: "UAE Dirham",
    currencyCode: "AED",
    flag: "🇦🇪",
    banks: [
      { name: "Emirates NBD" },
      { name: "Abu Dhabi Commercial Bank" },
      { name: "First Abu Dhabi Bank" },
      { name: "Mashreq Bank" },
      { name: "Dubai Islamic Bank" },
    ],
  },
  {
    country: "Japan",
    currency: "Japanese Yen",
    currencyCode: "JPY",
    flag: "🇯🇵",
    banks: [
      { name: "MUFG Bank" },
      { name: "Mizuho Bank" },
      { name: "Sumitomo Mitsui Banking Corporation" },
      { name: "Resona Bank" },
      { name: "Japan Post Bank" },
    ],
  },
  {
    country: "Brazil",
    currency: "Brazilian Real",
    currencyCode: "BRL",
    flag: "🇧🇷",
    banks: [
      { name: "Banco do Brasil" },
      { name: "Itaú Unibanco" },
      { name: "Bradesco" },
      { name: "Caixa Econômica Federal" },
      { name: "Santander Brasil" },
    ],
  },
];

export const GlobalBankConversion = () => {
  return (
    <Card className="mb-6 border-border">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Convert Crypto to Local Banks</CardTitle>
            <CardDescription>
              Convert your cryptocurrency to fiat currencies and receive funds directly to your local bank account worldwide
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="h-5 w-5 text-primary" />
            <p className="font-semibold text-sm">Global Coverage</p>
          </div>
          <p className="text-sm text-muted-foreground">
            With an Active CTTTradeZone wallet, you can convert any crypto to any fiat exchange of your choice and receive payments directly to your local banks across <strong>{globalBanks.length} countries</strong> and regions.
          </p>
        </div>

        <Accordion type="multiple" className="w-full">
          {globalBanks.map((region) => (
            <AccordionItem key={region.currencyCode} value={region.currencyCode}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{region.flag}</span>
                  <div className="text-left">
                    <p className="font-medium text-sm">{region.country}</p>
                    <p className="text-xs text-muted-foreground">{region.currency}</p>
                  </div>
                  <Badge variant="outline" className="ml-auto mr-2 text-xs">
                    {region.currencyCode}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pl-9 space-y-2">
                  <p className="text-xs text-muted-foreground mb-3">Supported banks in {region.country}:</p>
                  <div className="grid gap-2">
                    {region.banks.map((bank, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm"
                      >
                        <Landmark className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span>{bank.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-4 rounded-lg bg-accent/10 border border-accent/20 p-4">
          <p className="text-sm text-center">
            <span className="font-semibold text-accent">Need a bank not listed?</span>
            <br />
            <span className="text-muted-foreground text-xs">
              CTTTradeZone supports thousands of banks worldwide. Contact support for assistance with your specific bank.
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
