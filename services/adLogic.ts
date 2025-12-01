
import { AD_CONFIG } from './adConfig';

export const adLogic = {
  /**
   * Opens a Direct Link in a new tab and returns a promise that resolves
   * after a set duration, simulating "watching" the ad.
   */
  watchAd: (type: 'REWARD' | 'SAVEME' | 'INTERSTITIAL'): Promise<boolean> => {
    return new Promise((resolve) => {
      let url = AD_CONFIG.REWARD_VIDEO_URL;
      
      if (type === 'SAVEME') url = AD_CONFIG.SAVE_ME_URL;
      if (type === 'INTERSTITIAL') url = AD_CONFIG.INTERSTITIAL_URL;

      // 1. Open Ad
      window.open(url, '_blank');

      // 2. Wait (Simulate ad duration)
      // In a real mobile app you'd use callbacks. For web direct links, 
      // we assume user spent time if they return.
      // We resolve immediately so the UI can start its own countdown visually.
      resolve(true);
    });
  }
};
