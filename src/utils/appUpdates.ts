import { registerSW } from 'virtual:pwa-register';

/**
 * ATUALIZAÇÃO DO APP INSTALADO
 * ─────────────────────────────────────────────────────────────
 * No iPhone, o app da tela inicial quase nunca é recarregado do zero: ele
 * volta do segundo plano com o código antigo na memória. Sem uma verificação
 * ativa, o celular pode ficar dias numa versão anterior à do computador e,
 * com isso, não enxergar dados gravados no formato novo (foi o que escondeu
 * o quadro de afiliado no celular).
 *
 * Aqui o app procura uma versão nova ao abrir e sempre que volta para a
 * tela. Quando ela chega, o próprio registro do PWA (modo autoUpdate)
 * recarrega a página. Os dados ficam salvos no aparelho e são mesclados com a
 * nuvem na abertura seguinte, então a recarga não perde nada.
 */

/** Versão em uso (commit + data da publicação), mostrada em Ajustes. */
export const APP_BUILD = __APP_BUILD__;

export function appVersionLabel(): string {
  const at = new Date(APP_BUILD.builtAt);
  const when = Number.isFinite(at.getTime())
    ? at.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '';
  return [APP_BUILD.sha, when].filter(Boolean).join(' · ');
}

const MIN_CHECK_INTERVAL_MS = 60_000;

export function initAppUpdates(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      let lastCheck = 0;
      const check = () => {
        if (Date.now() - lastCheck < MIN_CHECK_INTERVAL_MS || navigator.onLine === false) return;
        lastCheck = Date.now();
        registration.update().catch(() => undefined);
      };
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
      window.addEventListener('focus', check);
    },
  });
}
