
// This file stores all your Ad Network configurations.
// Replace the placeholder URLs with your actual Direct Links or Script tags.

export const AD_CONFIG = {
  // 1. REWARD VIDEO (Direct Link for Energy Refill)
  REWARD_VIDEO_URL: "https://www.effectivegatecpm.com/jjfcn1fz?key=082ed11b137d176873ac5cf7d405dbf3", 

  // 2. SAVE ME (Direct Link when Energy is 0)
  SAVE_ME_URL: "https://www.effectivegatecpm.com/jjfcn1fz?key=082ed11b137d176873ac5cf7d405dbf3",

  // 3. RANDOM REWARD (Interstitial before Spin)
  INTERSTITIAL_URL: "https://www.effectivegatecpm.com/jjfcn1fz?key=082ed11b137d176873ac5cf7d405dbf3",

  // 4. RICH ADS ZONES (Telegram / Web)
  RICH_ADS: {
    PLAYABLE_ID: "4844",
    INTERSTITIAL_VIDEO: "379592",
    INTERSTITIAL_BANNER: "379591",
    EMBEDDED_BANNER: "379590",
    PUSH_STYLE: "379589"
  },

  // 5. BANNER CODES (HTML/JS)
  // Using RichAds Embedded Banner (Zone 379590)
  BANNER_CODE: `
    <div style="display: flex; justify-content: center; width: 100%; height: 100%;">
        <script src="https://richinfo.co/richpartners/telegram/js/tg-ob.js"></script>
        <script>
            window.TelegramAdsController = new TelegramAdsController();
            window.TelegramAdsController.initialize({
                pubId: "993592",
                appId: "379590"
            });
        </script>
    </div>
  `
};
