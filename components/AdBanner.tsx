
import React from 'react';
import { AD_CONFIG } from '../services/adConfig';

interface AdBannerProps {
  className?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ className = '' }) => {
  // We use an iframe to safely render ads that might use document.write()
  // This prevents the ad script from breaking the React application.
  
  const iframeContent = `
    <html>
      <body style="margin:0; padding:0; display:flex; justify-content:center; align-items:center; background-color: transparent;">
        ${AD_CONFIG.BANNER_CODE}
      </body>
    </html>
  `;

  return (
    <div className={`flex justify-center items-center my-4 overflow-hidden rounded-xl bg-surfaceLight/30 ${className}`}>
      <iframe
        title="Ad Banner"
        srcDoc={iframeContent}
        style={{
          width: '300px', // Matches Adsterra config
          height: '250px', // Matches Adsterra config
          border: 'none',
          overflow: 'hidden'
        }}
        scrolling="no"
      />
    </div>
  );
};
