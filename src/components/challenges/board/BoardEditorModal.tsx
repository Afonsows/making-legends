import React, { useEffect, useState } from 'react';
import { useChallengeStore } from '../../../state/useChallengeStore';
import { BoardMilestone, BoardRow, BoardSection, UserChallenge } from '../../../core/types';
import { goalPctOf, newBoardId } from '../../../core/board';
import { PillarId } from '../../../theme/types';
import { Menu, pillarColor } from '../../ui/kit';
import { sectionColor } from './BoardChallengeView';
import { ArrowDown, ArrowUp, CalendarDays, Columns3, List, Plus, Trash2, X } from 'lucide-react';

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const PILLARS: { id: PillarId; label: string }[] = [
  { id: 'genjutsu', label: 'Foco' },
  { id: 'ninjutsu', label: 'Mente' },
  { id: 'chakra', label: 'Disciplina' },
  { id: 'espirito', label: 'Confiança' },
  { id: 'taijutsu', label: 'Corpo' },
];

const toHex = (color: string | undefined, fallback = '#8b5cf6') => (color && /^#[0-9a-f]{6}$/i.test(color) ? color : fallback);

function move<T>(list: T[], index: number, dir: -1 | 1): T[] {
  const target = index + dir;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

const weekdaysLabel = (row: BoardRow) =>
  !row.weekdays || row.weekdays.length === 0 || row.weekdays.length === 7
    ? 'Todo dia'
    : row.weekdays.map((d) => WEEKDAY_NAMES[d]).join(', ');

interface BoardEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  challenge: UserChallenge;
}

/** Editor do quadro: seções, linhas, colunas, tarefas extras, dias da semana, meta do dia e datas marcantes. */
export const BoardEditorModal: React.FC<BoardEditorModalProps> = ({ isOpen, onClose, challenge }) => {
  const updateBoard = useChallengeStore((s) => s.updateBoard);
  const [sections, setSections] = useState<BoardSection[]>([]);
  const [goal, setGoal] = useState(80);
  const [milestones, setMilestones] = useState<BoardMilestone[]>([]);
  const [openWeekdays, setOpenWeekdays] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSections(JSON.parse(JSON.stringify(challenge.sections || [])));
    setGoal(goalPctOf(challenge));
    setMilestones(JSON.parse(JSON.stringify(challenge.milestones || [])));
    setOpenWeekdays(null);
  }, [isOpen, challenge]);

  if (!isOpen) return null;

  const patchSection = (id: string, patch: Partial<BoardSection>) =>
    setSections((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const patchRow = (sectionId: string, rowId: string, patch: Partial<BoardRow>) =>
    setSections((list) =>
      list.map((s) => (s.id === sectionId ? { ...s, rows: s.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)) } : s))
    );

  const addSection = (kind: BoardSection['kind']) => {
    const id = newBoardId('s');
    const section: BoardSection =
      kind === 'matrix'
        ? {
            id,
            title: 'Nova tabela',
            kind,
            pillarId: 'genjutsu',
            rows: [{ id: newBoardId('r'), label: 'Linha 1' }],
            columns: [
              { id: newBoardId('c'), label: 'Coluna 1' },
              { id: newBoardId('c'), label: 'Coluna 2' },
            ],
          }
        : { id, title: 'Nova lista', kind, pillarId: 'genjutsu', rows: [{ id: newBoardId('r'), label: 'Nova tarefa' }] };
    setSections((list) => [...list, section]);
  };

  const removeSection = (section: BoardSection) => {
    if (window.confirm(`Remover a seção "${section.title}" do quadro?`)) setSections((list) => list.filter((s) => s.id !== section.id));
  };

  const requiredPerDay = sections.reduce((acc, s) => {
    const rows = s.rows.filter((r) => !r.optional && r.label.trim() && (!r.weekdays || r.weekdays.length === 0 || r.weekdays.length === 7));
    return acc + rows.length * (s.kind === 'matrix' ? (s.columns || []).filter((c) => c.label.trim()).length : 1);
  }, 0);

  const handleSave = () => {
    updateBoard(challenge.id, { sections, dailyGoalPct: goal, milestones });
    onClose();
  };

  return (
    <div className="modal-overlay z-[95] animate-in fade-in" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Editar quadro"
        onClick={(e) => e.stopPropagation()}
        className="modal-panel w-full max-w-2xl bg-bg border border-line rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom"
      >
        <div className="px-5 pt-5 pb-4 border-b border-line flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="t-label">Personalizar</div>
            <h2 className="t-title text-[26px] text-ink mt-2.5">Editar quadro</h2>
          </div>
          <button type="button" onClick={onClose} className="icon-btn -mr-2 -mt-1.5" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain px-5 py-5 space-y-6">
          {/* Meta do dia */}
          <div className="card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[15px] font-semibold text-ink">Meta do dia</div>
                <p className="text-[13px] text-ink2 mt-0.5">
                  {Math.ceil((requiredPerDay * goal) / 100)} de {requiredPerDay} tarefas obrigatórias para o dia contar.
                </p>
              </div>
              <span className="t-num text-[26px] text-ink shrink-0">{goal}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={goal}
              onChange={(e) => setGoal(Number(e.target.value))}
              className="w-full mt-3 accent-[rgb(var(--accent))]"
              aria-label="Meta do dia em porcentagem"
            />
          </div>

          {/* Seções */}
          {sections.map((section, sIdx) => {
            const color = sectionColor(section);
            return (
              <div key={section.id} className="card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={toHex(section.color, '#8b5cf6')}
                    onChange={(e) => patchSection(section.id, { color: e.target.value })}
                    className="w-8 h-8 rounded-lg bg-transparent border border-line cursor-pointer shrink-0"
                    aria-label="Cor da seção"
                    style={{ outline: section.color ? undefined : `2px solid ${color}` }}
                  />
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => patchSection(section.id, { title: e.target.value })}
                    className="field !min-h-[2.25rem] !text-[15px] font-semibold"
                    aria-label="Nome da seção"
                  />
                  <Menu
                    label={`Opções de ${section.title}`}
                    items={[
                      { label: 'Subir seção', icon: ArrowUp, onSelect: () => setSections((l) => move(l, sIdx, -1)), hidden: sIdx === 0 },
                      { label: 'Descer seção', icon: ArrowDown, onSelect: () => setSections((l) => move(l, sIdx, 1)), hidden: sIdx === sections.length - 1 },
                      { label: 'Remover seção', icon: Trash2, onSelect: () => removeSection(section), danger: true },
                    ]}
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="chip">
                    {section.kind === 'matrix' ? <Columns3 className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
                    {section.kind === 'matrix' ? 'Tabela' : 'Lista'}
                  </span>
                  <select
                    value={section.pillarId || 'genjutsu'}
                    onChange={(e) => patchSection(section.id, { pillarId: e.target.value as PillarId })}
                    className="chip bg-transparent pr-2 cursor-pointer"
                    aria-label="Atributo que recebe o XP"
                  >
                    {PILLARS.map((p) => (
                      <option key={p.id} value={p.id}>
                        XP em {p.label}
                      </option>
                    ))}
                  </select>
                  {section.color && (
                    <button type="button" className="chip" onClick={() => patchSection(section.id, { color: undefined })}>
                      <i className="w-2.5 h-2.5 rounded-full" style={{ background: pillarColor(section.pillarId) }} /> Cor do atributo
                    </button>
                  )}
                </div>

                {/* Colunas (tabela) */}
                {section.kind === 'matrix' && (
                  <div>
                    <div className="t-label mb-2">Colunas</div>
                    <div className="flex flex-wrap gap-1.5">
                      {(section.columns || []).map((col, cIdx) => (
                        <span key={col.id} className="inline-flex items-center rounded-lg bg-surface2 pl-2 pr-0.5">
                          <input
                            type="text"
                            value={col.label}
                            onChange={(e) =>
                              patchSection(section.id, {
                                columns: (section.columns || []).map((c) => (c.id === col.id ? { ...c, label: e.target.value } : c)),
                              })
                            }
                            className="bg-transparent text-[13px] text-ink w-20 h-8 focus:outline-none"
                            aria-label={`Coluna ${cIdx + 1}`}
                          />
                          <button
                            type="button"
                            onClick={() => patchSection(section.id, { columns: (section.columns || []).filter((c) => c.id !== col.id) })}
                            className="w-7 h-7 flex items-center justify-center text-ink3 hover:text-accent"
                            aria-label={`Remover coluna ${col.label}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          patchSection(section.id, {
                            columns: [...(section.columns || []), { id: newBoardId('c'), label: 'Nova' }],
                          })
                        }
                        className="chip h-8"
                      >
                        <Plus className="w-3.5 h-3.5" /> Coluna
                      </button>
                    </div>
                  </div>
                )}

                {/* Linhas */}
                <div>
                  <div className="t-label mb-1">{section.kind === 'matrix' ? 'Linhas' : 'Tarefas'}</div>
                  <ul className="divide-y divide-line">
                    {section.rows.map((row, rIdx) => {
                      const wdOpen = openWeekdays === `${section.id}/${row.id}`;
                      return (
                        <li key={row.id} className="py-2">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={row.label}
                              onChange={(e) => patchRow(section.id, row.id, { label: e.target.value })}
                              className="flex-1 min-w-0 bg-transparent text-[14px] text-ink h-9 focus:outline-none border-b border-transparent focus:border-ink3"
                              aria-label="Nome da linha"
                            />
                            <button
                              type="button"
                              onClick={() => patchRow(section.id, row.id, { optional: !row.optional })}
                              className={`chip !h-7 !px-2 ${row.optional ? 'chip-on' : ''}`}
                              aria-pressed={Boolean(row.optional)}
                              title="Tarefa extra: dá XP, mas não entra na meta do dia"
                            >
                              Extra
                            </button>
                            <button
                              type="button"
                              onClick={() => setOpenWeekdays(wdOpen ? null : `${section.id}/${row.id}`)}
                              className={`icon-btn !w-8 !h-8 ${row.weekdays?.length ? '!text-accent' : ''}`}
                              aria-label={`Dias da semana: ${weekdaysLabel(row)}`}
                              title={weekdaysLabel(row)}
                            >
                              <CalendarDays className="w-4 h-4" />
                            </button>
                            <Menu
                              label={`Opções de ${row.label}`}
                              items={[
                                {
                                  label: 'Subir',
                                  icon: ArrowUp,
                                  onSelect: () => patchSection(section.id, { rows: move(section.rows, rIdx, -1) }),
                                  hidden: rIdx === 0,
                                },
                                {
                                  label: 'Descer',
                                  icon: ArrowDown,
                                  onSelect: () => patchSection(section.id, { rows: move(section.rows, rIdx, 1) }),
                                  hidden: rIdx === section.rows.length - 1,
                                },
                                {
                                  label: 'Remover',
                                  icon: Trash2,
                                  danger: true,
                                  onSelect: () => patchSection(section.id, { rows: section.rows.filter((r) => r.id !== row.id) }),
                                },
                              ]}
                            />
                          </div>
                          {wdOpen && (
                            <div className="flex items-center gap-1 mt-1.5 animate-in fade-in">
                              {WEEKDAYS.map((label, d) => {
                                const on = (row.weekdays || []).includes(d);
                                return (
                                  <button
                                    key={d}
                                    type="button"
                                    onClick={() =>
                                      patchRow(section.id, row.id, {
                                        weekdays: on ? (row.weekdays || []).filter((x) => x !== d) : [...(row.weekdays || []), d].sort(),
                                      })
                                    }
                                    className={`w-8 h-8 rounded-full text-[12px] font-semibold border ${on ? 'bg-ink border-ink text-bg' : 'border-line text-ink2'}`}
                                    aria-pressed={on}
                                    aria-label={WEEKDAY_NAMES[d]}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                              <span className="text-[12px] text-ink3 ml-1.5">{weekdaysLabel(row)}</span>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  <button
                    type="button"
                    onClick={() =>
                      patchSection(section.id, {
                        rows: [
                          ...section.rows,
                          { id: newBoardId('r'), label: section.kind === 'matrix' ? `Linha ${section.rows.length + 1}` : 'Nova tarefa' },
                        ],
                      })
                    }
                    className="btn btn-ghost btn-sm mt-2"
                  >
                    <Plus className="w-4 h-4" /> {section.kind === 'matrix' ? 'Linha' : 'Tarefa'}
                  </button>
                </div>
              </div>
            );
          })}

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => addSection('list')} className="btn btn-ghost">
              <List className="w-4 h-4" /> Nova lista
            </button>
            <button type="button" onClick={() => addSection('matrix')} className="btn btn-ghost">
              <Columns3 className="w-4 h-4" /> Nova tabela
            </button>
          </div>

          {/* Datas marcantes */}
          <div className="card p-4">
            <div className="text-[15px] font-semibold text-ink">Datas marcantes</div>
            <p className="text-[13px] text-ink2 mt-0.5">Aparecem no resumo (contagem regressiva) e no mapa.</p>
            <ul className="mt-3 space-y-2">
              {milestones.map((m) => (
                <li key={m.id} className="flex items-center gap-2">
                  <input
                    type="date"
                    value={m.date}
                    onChange={(e) => setMilestones((l) => l.map((x) => (x.id === m.id ? { ...x, date: e.target.value } : x)))}
                    className="field !min-h-[2.25rem] !w-auto !px-2 text-[13px]"
                    aria-label="Data"
                  />
                  <input
                    type="text"
                    value={m.label}
                    onChange={(e) => setMilestones((l) => l.map((x) => (x.id === m.id ? { ...x, label: e.target.value } : x)))}
                    className="field !min-h-[2.25rem] text-[14px]"
                    aria-label="Nome da data"
                  />
                  <button
                    type="button"
                    onClick={() => setMilestones((l) => l.filter((x) => x.id !== m.id))}
                    className="icon-btn !w-9 !h-9 shrink-0"
                    aria-label={`Remover ${m.label}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setMilestones((l) => [...l, { id: newBoardId('m'), date: challenge.startDate, label: 'Nova data' }])}
              className="btn btn-ghost btn-sm mt-3"
            >
              <Plus className="w-4 h-4" /> Data
            </button>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-line flex items-center justify-end gap-2" style={{ paddingBottom: 'max(var(--safe-bottom), 0.75rem)' }}>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">
            Cancelar
          </button>
          <button type="button" onClick={handleSave} className="btn btn-solid btn-sm">
            Salvar quadro
          </button>
        </div>
      </div>
    </div>
  );
};
