import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ThemeConfig, PillarId, UserRankId, MissionRank } from './types';
import { shinobiTheme } from './shinobi.theme';
import { getRankIdFromLevel } from '../core/xpEngine';
import { getPhaseBounds } from '../core/streakEngine';

interface ThemeContextType {
  theme: ThemeConfig;
  setTheme: (theme: ThemeConfig) => void;
  getPillar: (id: PillarId) => ThemeConfig['pillars'][PillarId];
  getRankByLevel: (level: number) => ThemeConfig['ranks'][UserRankId];
  getMissionRankInfo: (rank: MissionRank) => ThemeConfig['missionRanks'][MissionRank];
  getPhaseInfo: (day: number, targetDays?: number) => ThemeConfig['protocolPhases'][1 | 2 | 3];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeConfig>(shinobiTheme);

  const getPillar = (id: PillarId) => {
    return theme.pillars[id] || theme.pillars.taijutsu;
  };

  const getRankByLevel = (level: number) => theme.ranks[getRankIdFromLevel(level)];

  const getMissionRankInfo = (rank: MissionRank) => {
    return theme.missionRanks[rank] || theme.missionRanks.D;
  };

  /** Fase do desafio proporcional à duração escolhida (terços). */
  const getPhaseInfo = (day: number, targetDays: number = 66) => {
    const { p1, p2 } = getPhaseBounds(targetDays);
    const phase = day <= p1 ? 1 : day <= p2 ? 2 : 3;
    const ranges = { 1: `Dias 1–${p1}`, 2: `Dias ${p1 + 1}–${p2}`, 3: `Dias ${p2 + 1}–${targetDays}` };
    return { ...theme.protocolPhases[phase], daysRange: ranges[phase] };
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        getPillar,
        getRankByLevel,
        getMissionRankInfo,
        getPhaseInfo,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser utilizado dentro de um ThemeProvider');
  }
  return context;
};
