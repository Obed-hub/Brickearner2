
import React, { useEffect, useRef } from 'react';
import { AD_CONFIG } from '../services/adConfig';

interface AdBannerProps {
  className?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ className = '' }) => {
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = bannerRef.current;
    if (!container) return;

    // Reset container to prevent duplicates
    container.innerHTML = '';

    try {
        // We use createContextualFragment to properly parse HTML strings 
        // and execute any embedded <script> tags within the main window context.
        // This is necessary for Ad Networks (like RichAds/TelegramAds) that require
        // domain validation or access to the global window object.
        const range = document.createRange();
        range.selectNode(container);
        const fragment = range.createContextualFragment(AD_CONFIG.BANNER_CODE);
        container.appendChild(fragment);
    } catch (e) {
        console.error("AdBanner injection error:", e);
    }

    return () => {
        if (container) container.innerHTML = '';
    };
  }, []);

  return (
    <div 
        ref={bannerRef} 
        className={`flex justify-center items-center my-4 overflow-hidden rounded-xl bg-surfaceLight/30 w-full min-h-[250px] ${className}`}
    >
        {/* Ad Injected Here */}
    </div>
  );
};
