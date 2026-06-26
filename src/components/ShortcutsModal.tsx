import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Keyboard, Plus, Calendar, TrendingUp, History, CornerDownLeft, ChevronLeft, ChevronRight, Moon, AlertTriangle, Bell } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  const shortcutGroups = [
    {
      title: 'Ações Gerais',
      shortcuts: [
        { keys: ['N'], desc: 'Abrir formulário de nova tarefa', icon: Plus },
        { keys: ['P'], desc: 'Ativar / Desativar notificações de lembrete', icon: Bell },
        { keys: ['Esc'], desc: 'Fechar qualquer modal aberto', icon: X },
        { keys: ['?'], desc: 'Abrir / Fechar este menu de atalhos', icon: Keyboard },
      ],
    },
    {
      title: 'Navegação de Abas',
      shortcuts: [
        { keys: ['1'], desc: 'Mudar para aba "Meu Cronograma"', icon: Calendar },
        { keys: ['2'], desc: 'Mudar para aba "Estatísticas"', icon: TrendingUp },
        { keys: ['3'], desc: 'Mudar para aba "Histórico"', icon: History },
      ],
    },
    {
      title: 'Navegação de Calendário',
      shortcuts: [
        { keys: ['T'], desc: 'Retornar para a data de hoje (Hoje)', icon: Calendar },
        { keys: ['←'], desc: 'Ir para o dia anterior', icon: ChevronLeft },
        { keys: ['→'], desc: 'Ir para o próximo dia', icon: ChevronRight },
      ],
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white p-5 sm:p-6 shadow-xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-500">
                  <Keyboard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                    Atalhos de Teclado
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 font-medium">
                    Agilize sua produtividade usando os atalhos abaixo
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* List */}
            <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
              {shortcutGroups.map((group) => (
                <div key={group.title} className="space-y-2">
                  <h4 className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider pl-1">
                    {group.title}
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {group.shortcuts.map((shortcut) => {
                      const IconComponent = shortcut.icon;
                      return (
                        <div
                          key={shortcut.desc}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-850/40 border border-slate-100/50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <IconComponent className="h-4 w-4 text-slate-400 shrink-0" />
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">
                              {shortcut.desc}
                            </span>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            {shortcut.keys.map((key) => (
                              <kbd
                                key={key}
                                className="px-2 py-0.5 min-w-[24px] text-center text-[10px] font-bold text-slate-600 bg-white border border-slate-200 rounded-md shadow-xs dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                              >
                                {key}
                              </kbd>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer tips */}
            <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 font-medium text-center">
              Dica: Experimente pressionar <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-md dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400">?</kbd> em qualquer momento para abrir ou ocultar este guia.
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
