import { useEffect } from 'react';
import analytics from '../lib/analytics';

export function useAnalytics() {
  useEffect(() => {
    analytics.initAnalytics();
    analytics.pageview();
    // track SPA navigation using history API
    const onPop = () => analytics.pageview(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return analytics;
}

export default useAnalytics;
