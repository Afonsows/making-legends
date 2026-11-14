import React from 'react';
import { Bell, ChevronRight, Cloud, CloudOff } from 'lucide-react';
import { useUserStore } from '../../state/useUserStore';
import { ThemeMode, useUIStore } from '../../state/useUIStore';
import { Segmented, Sheet, Switch } from '../ui/kit';

interface SettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNotifications: () => void;
  onOpenAuth: () => void;
  isCloudSynced: boolean;
  accountEmail?: string;
}

const THEME_OPTIONS: { id: ThemeMode; label: string }[] = [
  { id: 'system', label: 'Sistema' },
  { id: 'light', label: 'Claro' },
  { id: 'dark', label: 'Escuro' },
];

const Row: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  detail: string;
  onClick: () => void;
}> = ({ icon: Icon, title, detail, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center gap-3 py-3.5 text-left border-t border-line first:border-t-0"
  >
    <Icon className="w-5 h-5 text-ink2 shrink-0" />
    <span className="min-w-0 flex-1">
      <span className="block text-[15px] font-semibold text-ink">{title}</span>
      <span className="block text-[13px] text-ink2 truncate">{detail}</span>
    </span>
    <ChevronRight className="w-4 h-4 text-ink3 shrink-0" />
  </button>
);

/** Ajustes: aparência, sons, lembretes e conta — tudo que antes ficava espalhado no cabeçalho. */
export const SettingsSheet: React.FC<SettingsSheetProps> = ({
  isOpen,
  onClose,
  onOpenNotifications,
  onOpenAuth,
  isCloudSynced,
  accountEmail,
}) => {
  const { themeMode, setThemeMode } = useUIStore();
  const soundEnabled = useUserStore((s) => s.profile.notificationSettings.soundEnabled !== false);
  const remindersOn = useUserStore((s) => s.profile.notificationSettings.enabled);
  const updateNotifications = useUserStore((s) => s.updateNotifications);

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Ajustes">
      <div className="space-y-6 pt-1">
        <section>
          <div className="t-label mb-2.5">Aparência</div>
          <Segmented options={THEME_OPTIONS} value={themeMode} onChange={setThemeMode} />
        </section>

        <section>
          <div className="t-label mb-1">Preferências</div>
          <div className="flex items-center gap-3 py-3.5">
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-ink">Sons</span>
              <span className="block text-[13px] text-ink2">Efeitos ao concluir missões e subir de nível</span>
            </span>
            <Switch checked={soundEnabled} onChange={(next) => updateNotifications({ soundEnabled: next })} label="Sons" />
          </div>
          <Row
            icon={Bell}
            title="Lembretes"
            detail={remindersOn ? 'Ativados' : 'Desativados'}
            onClick={() => {
              onClose();
              onOpenNotifications();
            }}
          />
          <Row
            icon={isCloudSynced ? Cloud : CloudOff}
            title="Conta e sincronização"
            detail={isCloudSynced ? accountEmail || 'Sincronizado na nuvem' : 'Salvo só neste aparelho'}
            onClick={() => {
              onClose();
              onOpenAuth();
            }}
          />
        </section>
      </div>
    </Sheet>
  );
};
