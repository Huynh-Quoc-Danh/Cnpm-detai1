// Sites data provider: loads /api/sites, falls back to bundled offline data when the API fails.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { HeritageSite } from '../types';
import { api } from '../services/api';
import { offlineSites } from '../data/offlineSites';

export interface SitesContextValue {
  sites: HeritageSite[];
  loading: boolean;
  /** Error message when the API could not be reached (offline data is then used). */
  error: string | null;
  /** True when `sites` comes from the offline fallback. */
  offline: boolean;
  reload: () => Promise<void>;
  getSite: (id: number) => HeritageSite | undefined;
}

const SitesContext = createContext<SitesContextValue | null>(null);

export const SitesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sites, setSites] = useState<HeritageSite[]>(offlineSites);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(true);
  const seq = useRef(0);

  const reload = useCallback(async () => {
    const my = ++seq.current;
    setLoading(true);
    try {
      const data = await api.getSites();
      if (my !== seq.current) return;
      if (Array.isArray(data) && data.length) {
        setSites(data.map((s) => ({ ...s, exhibits: Array.isArray(s.exhibits) ? s.exhibits : [] })));
        setOffline(false);
        setError(null);
      } else {
        setSites(offlineSites);
        setOffline(true);
        setError('Máy chủ chưa có dữ liệu địa điểm – đang dùng dữ liệu ngoại tuyến.');
      }
    } catch (err: any) {
      if (my !== seq.current) return;
      setSites(offlineSites);
      setOffline(true);
      setError((err && err.message) || 'Không thể tải dữ liệu địa điểm');
    } finally {
      if (my === seq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const byId = useMemo(() => new Map(sites.map((s) => [s.id, s])), [sites]);
  const getSite = useCallback((id: number) => byId.get(Number(id)), [byId]);

  const value = useMemo<SitesContextValue>(
    () => ({ sites, loading, error, offline, reload, getSite }),
    [sites, loading, error, offline, reload, getSite]
  );

  return <SitesContext.Provider value={value}>{children}</SitesContext.Provider>;
};

export function useSites(): SitesContextValue {
  const ctx = useContext(SitesContext);
  if (!ctx) throw new Error('useSites() must be used inside <SitesProvider>');
  return ctx;
}
