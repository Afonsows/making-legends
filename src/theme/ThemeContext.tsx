import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ThemeConfig, PillarId, UserRankId, MissionRank } from './types';
import { shinobiTheme } from './shinobi.theme';

interface ThemeContextType {
  theme: ThemeConfig;
  setTheme: (theme: ThemeConfig) => void;
  getPillar: (id: PillarId) => ThemeConfig['pillars'][PillarId];
  getRankByLevel: (level: number) => ThemeConfig['ranks'][UserRankId];
  getMissionRankInfo: (rank: MissionRank) => ThemeConfig['missionRanks'][MissionRank];
  getPhaseInfo: (day: number) => ThemeConfig['protocolPhases'][1 | 2 | 3];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeConfig>(shinobiTheme);

  const getPillar = (id: PillarId) => {
    return theme.pillars[id] || theme.pillars.taijutsu;
  };

  const getRankByLevel = (level: number) => {
    if (level >= 66) return theme.ranks.kage;
    if (level >= 50) return theme.ranks.sannin;
    if (level >= 35) return theme.ranks.anbu;
    if (level >= 22) return theme.ranks.jonin;
    if (level >= 12) return theme.ranks.chunin;
    if (level >= 5) return theme.ranks.genin;
    return theme.ranks.aspirante;
  };

  const getMissionRankInfo = (rank: MissionRank) => {
    return theme.missionRanks[rank] || theme.missionRanks.D;
  };

  const getPhaseInfo = (day: number) => {
    if (day <= 22) return theme.protocolPhases[1];
    if (day <= 44) return theme.protocolPhases[2];
    return theme.protocolPhases[3];
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
