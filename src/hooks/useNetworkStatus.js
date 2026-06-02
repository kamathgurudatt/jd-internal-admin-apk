import {useState, useEffect} from 'react';
import {getBaseUrl, getToken} from '../api/client';

export default function useNetworkStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let active = true;
    const check = async () => {
      const url = getBaseUrl();
      const tok = getToken();
      if (!url || !tok) return;
      try {
        const r = await fetch(`${url}/api/employees`, {
          method: 'HEAD',
          headers: {Authorization: `Bearer ${tok}`},
          signal: AbortSignal.timeout(4000),
        });
        if (active) setOnline(r.ok || r.status === 401 || r.status === 403);
      } catch {
        if (active) setOnline(false);
      }
    };
    check();
    const id = setInterval(check, 15000);
    return () => { active = false; clearInterval(id); };
  }, []);

  return online;
}
