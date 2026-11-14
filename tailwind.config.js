import colors from 'tailwindcss/colors';
import plugin from 'tailwindcss/plugin';

/**
 * Sistema visual "Obsidiana" do Making Legends.
 *
 * Todas as cores são variáveis CSS (canais RGB), o que permite alternar entre
 * tema claro e escuro só trocando a classe do <html> (`dark` | `light`).
 *
 * - Tokens semânticos (bg, surface, ink, accent...) → usados nas telas novas.
 * - Paletas do Tailwind (slate, amber, emerald...) → continuam funcionando nas
 *   telas antigas, mas no tema claro a ESCALA É INVERTIDA (300 ↔ 700 etc.),
 *   de modo que um texto claro sobre fundo escuro vira texto escuro sobre fundo claro.
 */

const hexToChannels = (hex) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

const SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

// No tema claro: tons de texto/tinta se invertem; 500 e 600 (preenchimentos sólidos) ficam como estão.
const LIGHT_SHADE = {
  50: '950', 100: '900', 200: '800', 300: '700', 400: '600',
  500: '500', 600: '600',
  700: '300', 800: '200', 900: '100', 950: '50',
};

// Rampa neutra quente (substitui o slate azulado) — escuro e claro.
const NEUTRAL_DARK = {
  50: '#FAF8F3', 100: '#F5F1E8', 200: '#E3DED3', 300: '#C6C1B5', 400: '#A8A398', 500: '#7A766C',
  600: '#4A4741', 700: '#33312D', 800: '#24231F', 900: '#161513', 950: '#0C0B0A',
};
const NEUTRAL_LIGHT = {
  50: '#0C0B0A', 100: '#161410', 200: '#2B2823', 300: '#48443C', 400: '#686359', 500: '#8E887C',
  600: '#C9C3B6', 700: '#E0DBD0', 800: '#EFEBE3', 900: '#FFFFFF', 950: '#F6F3ED',
};

const NEUTRAL_FAMILIES = ['slate', 'gray', 'zinc', 'neutral', 'stone'];
const HUE_FAMILIES = [
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan',
  'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
];

const paletteColors = {};
const darkVars = {};
const lightVars = {};

for (const family of NEUTRAL_FAMILIES) {
  paletteColors[family] = {};
  for (const shade of SHADES) {
    paletteColors[family][shade] = `rgb(var(--n-${shade}) / <alpha-value>)`;
  }
}
for (const shade of SHADES) {
  darkVars[`--n-${shade}`] = hexToChannels(NEUTRAL_DARK[shade]);
  lightVars[`--n-${shade}`] = hexToChannels(NEUTRAL_LIGHT[shade]);
}

for (const family of HUE_FAMILIES) {
  paletteColors[family] = {};
  for (const shade of SHADES) {
    const name = `--c-${family}-${shade}`;
    paletteColors[family][shade] = `rgb(var(${name}) / <alpha-value>)`;
    darkVars[name] = hexToChannels(colors[family][shade]);
    lightVars[name] = hexToChannels(colors[family][LIGHT_SHADE[shade]]);
  }
}

const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ...paletteColors,
        // "Branco" acompanha o tema (vira tinta escura no claro). Para texto sobre cor sólida use `onaccent`.
        white: token('white'),
        onaccent: '#ffffff',

        // ── Tokens semânticos ──
        bg: token('bg'),
        surface: token('surface'),
        surface2: token('surface-2'),
        line: token('line'),
        ink: token('ink'),
        ink2: token('ink-2'),
        ink3: token('ink-3'),
        accent: token('accent'),
        ok: token('ok'),
        gold: token('gold'),
        warn: token('warn'),

        // ── Nomes antigos, agora apontando para os tokens ──
        shinobi: {
          bg: token('bg'),
          card: token('surface'),
          cardHover: token('surface-2'),
          border: token('line'),
          gold: token('gold'),
          goldHover: token('gold'),
          crimson: token('accent'),
          crimsonGlow: token('accent'),
          crimsonDeep: token('accent'),
          emerald: token('ok'),
          jade: token('ok'),
          chakra: token('pillar-ninjutsu'),
          violet: token('pillar-genjutsu'),
          obsidian: token('surface'),
          slateCut: token('line'),
          titanium: token('line'),
          orange: token('accent'),
          orangeGlow: token('accent'),
          orangeDeep: token('accent'),
          scroll: token('surface-2'),
          scrollAccent: token('gold'),
          textMuted: token('ink-2'),
        },
      },
      fontFamily: {
        sans: ['Archivo', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Archivo', 'system-ui', 'sans-serif'],
        kanji: ['Yuji Syuku', 'Noto Serif JP', 'serif'],
        // Números e rótulos: a mesma família, com algarismos tabulares (sem fonte monoespaçada).
        mono: ['Archivo', 'system-ui', 'sans-serif', { fontFeatureSettings: '"tnum"' }],
      },
      boxShadow: {
        // Brilhos antigos desativados: o design novo é plano.
        'glow-crimson': 'none',
        'glow-gold': 'none',
        'glow-chakra': 'none',
        'glow-jade': 'none',
        'glow-emerald': 'none',
        'glow-violet': 'none',
        'glow-orange': 'none',
        sheet: '0 -8px 40px -12px rgb(0 0 0 / 0.35)',
        pop: '0 12px 32px -8px rgb(0 0 0 / 0.35)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'pulse-glow': 'none',
        float: 'float 4s ease-in-out infinite',
        shimmer: 'shimmer 2s infinite',
      },
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      addBase({
        ':root': darkVars,
        'html.light': lightVars,
      });
    }),
  ],
};
