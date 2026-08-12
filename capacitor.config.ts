import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ctttradezone.app",
  appName: "ctttradezone",
  webDir: "dist",
  server: {
    // Shipped apps load the live site so content stays current.
    url: "https://ctttradezone.com",
    cleartext: false,
  },
};

export default config;
