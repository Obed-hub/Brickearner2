
// This file stores all your Ad Network configurations.
// Replace the placeholder URLs with your actual Direct Links or Script tags from Adsterra, Monetag, CPA Grip, etc.

export const AD_CONFIG = {
  // 1. REWARD VIDEO (Direct Link for Energy Refill)
  // Used for: Mining Button, Energy Refill, Save Me
  REWARD_VIDEO_URL: "https://www.effectivegatecpm.com/jjfcn1fz?key=082ed11b137d176873ac5cf7d405dbf3", 

  // 2. SAVE ME (Direct Link when Energy is 0)
  SAVE_ME_URL: "https://www.effectivegatecpm.com/jjfcn1fz?key=082ed11b137d176873ac5cf7d405dbf3",

  // 3. RANDOM REWARD (Interstitial before Spin)
  INTERSTITIAL_URL: "https://www.effectivegatecpm.com/jjfcn1fz?key=082ed11b137d176873ac5cf7d405dbf3",

  // 4. OFFER WALL (CPA Tasks)
  // Source: CPA Grip -> ID 1857863
  // Using direct 'show' URL to render offers in iframe without redirecting top window
  OFFER_WALL_URL: "https://playabledownloads.com/show.php?l=1&id=1857863", 

  // 5. BANNER CODES (HTML/JS)
  // Adsterra 300x250 Banner
  BANNER_CODE: `
    <div style="display: flex; justify-content: center;">
        <script type="text/javascript">
            atOptions = {
                'key' : 'a1195e69f7fa1f3c4bd75e7e95f6ad4a',
                'format' : 'iframe',
                'height' : 250,
                'width' : 300,
                'params' : {}
            };
        </script>
        <script type="text/javascript" src="//www.highperformanceformat.com/a1195e69f7fa1f3c4bd75e7e95f6ad4a/invoke.js"></script>
    </div>
  `
};
