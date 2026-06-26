import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Calendar, Clock, Sparkles, Inbox, Edit2, AlertCircle, XCircle } from 'lucide-react';
import { Task, TaskCompletion, HistoryPeriod } from '../types';
import { formatDateString, getWeekRange, getMonthRange, formatFullDate, isTaskActiveOnDay } from '../utils/dateUtils';

interface HistoryTabProps {
  tasks: Task[];
  completions: TaskCompletion[];
  currentDate: Date;
  onToggleComplete: (taskId: string, date: string) => void;
  onEditTask: (task: Task, date: string) => void;
}

export default function HistoryTab({
  tasks,
  completions,
  currentDate,
  onToggleComplete,
  onEditTask,
}: HistoryTabProps) {
  const [period, setPeriod] = useState<HistoryPeriod>('today');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');

  // Filtra as datas baseadas no período selecionado (do início do período até hoje)
  const getPeriodDates = () => {
    if (period === 'today') {
      return [new Date(currentDate)];
    }
    const { start, end } = period === 'week' ? getWeekRange(currentDate) : getMonthRange(currentDate);
    
    // Gera datas no intervalo
    const dates: Date[] = [];
    const curr = new Date(start);
    const limitDate = new Date(currentDate);
    limitDate.setHours(23, 59, 59, 999);
    
    while (curr <= end && curr <= limitDate) {
      dates.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }
    return dates;
  };

  const periodDates = getPeriodDates();

  interface HistoryItem {
    task: Task;
    date: string; // YYYY-MM-DD
    isCompleted: boolean;
    isActualPending: boolean;
    completedAt?: string;
    completedTime?: string;
    delayReason?: string;
  }

  // Gera a lista completa de tarefas e seus status de conclusão para cada dia do período
  const allItems: HistoryItem[] = [];

  const now = new Date();
  const todayStr = formatDateString(now);
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentMinutes = currentHour * 60 + currentMinute;

  periodDates.forEach((date) => {
    const dStr = formatDateString(date);
    const activeTasks = tasks.filter((t) => isTaskActiveOnDay(t, dStr));
    
    activeTasks.forEach((task) => {
      const completion = completions.find((c) => c.taskId === task.id && c.date === dStr);
      const isCompleted = !!completion;
      
      let isActualPending = false;
      if (!isCompleted) {
        if (dStr > todayStr) {
          isActualPending = true;
        } else if (dStr === todayStr) {
          const [taskH, taskM] = task.hour.split(':').map(Number);
          const taskMinutes = taskH * 60 + taskM;
          if (currentMinutes <= taskMinutes + 10) {
            isActualPending = true;
          }
        }
      }

      allItems.push({
        task,
        date: dStr,
        isCompleted,
        isActualPending,
        completedAt: completion?.completedAt,
        completedTime: completion?.completedTime,
        delayReason: completion?.delayReason,
      });
    });
  });

  // Filtra de acordo com o statusFilter
  const filteredItems = allItems.filter((item) => {
    if (statusFilter === 'completed') return item.isCompleted;
    if (statusFilter === 'pending') return item.isActualPending;
    return true; // 'all'
  });

  // Ordena os itens: data decrescente, e depois por hora planejada crescente (para ficar cronológico)
  const sortedItems = filteredItems.sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    return a.task.hour.localeCompare(b.task.hour);
  });

  // Formata o timestamp ISO de conclusão para hora "HH:MM"
  const formatCompletionTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  const formatCompletionFullDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return formatFullDate(d);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-6 shadow-xs dark:bg-slate-900 dark:border-slate-800">
      {/* Header com Filtros */}
      <div className="flex flex-col gap-4 mb-6 border-b border-slate-50 pb-4 dark:border-slate-800/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Histórico de Atividades
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Visualize, altere e edite os dados das tarefas concluídas ou pendentes
            </p>
          </div>

          {/* Seletor de Período */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl dark:bg-slate-800 self-start sm:self-center shrink-0">
            {(['today', 'week', 'month'] as HistoryPeriod[]).map((p) => {
              const labels = {
                today: 'Hoje',
                week: 'Semana',
                month: 'Mês',
              };
              return (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    period === p
                      ? 'bg-white text-slate-950 shadow-xs dark:bg-slate-700 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {labels[p]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Seletor de Status (Concluída, Pendente, Todas) */}
        <div className="flex items-center gap-1 bg-slate-150/50 p-1 rounded-xl dark:bg-slate-800/60 self-start">
          <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2">
            Status:
          </span>
          {([
            { id: 'all', label: 'Todas' },
            { id: 'completed', label: 'Concluídas' },
            { id: 'pending', label: 'Pendentes' },
          ] as { id: 'all' | 'completed' | 'pending'; label: string }[]).map((statusOption) => (
            <button
              key={statusOption.id}
              onClick={() => setStatusFilter(statusOption.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                statusFilter === statusOption.id
                  ? 'bg-white text-slate-950 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {statusOption.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Atividades */}
      <div className="relative">
        <AnimatePresence mode="popLayout">
          {sortedItems.length > 0 ? (
            <div className="space-y-4">
              {/* Timeline Line */}
              <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-slate-100 dark:bg-slate-800 hidden sm:block" />

              {sortedItems.map((item, index) => {
                const { task, isCompleted, date } = item;
                
                return (
                  <motion.div
                    key={`${task.id}-${date}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2, delay: Math.min(index * 0.05, 0.3) }}
                    className="relative flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-800/20 dark:hover:bg-slate-800/40 p-4 rounded-xl border border-slate-100/40 dark:border-slate-800/60 transition-all group"
                  >
                    {/* Indicador de Timeline (Ponto colorido) */}
                    <div className={`absolute left-6 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 -translate-x-1.5 hidden sm:block ${
                      isCompleted ? 'bg-emerald-500' : item.isActualPending ? 'bg-amber-500' : 'bg-rose-500'
                    }`} />

                    {/* Checkmark ou indicador de pendente */}
                    <div className="flex items-center gap-3 sm:pl-8">
                      {isCompleted ? (
                        <button
                          onClick={() => onToggleComplete(task.id, date)}
                          className="h-6 w-6 rounded-md bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center cursor-pointer hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-400 transition-colors group/check shrink-0 animate-scale"
                          title="Reverter conclusão"
                        >
                          <CheckCircle2 className="h-4.5 w-4.5 shrink-0 group-hover/check:hidden" />
                          <span className="hidden group-hover/check:block text-[9px] font-black">Desfazer</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onToggleComplete(task.id, date)}
                          className={`h-6 w-6 rounded-md flex items-center justify-center cursor-pointer transition-colors group/check shrink-0 ${
                            item.isActualPending
                              ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 hover:bg-emerald-100 hover:text-emerald-600 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-400'
                              : 'bg-rose-50 text-rose-400 dark:bg-rose-950/20 dark:text-rose-500 hover:bg-emerald-100 hover:text-emerald-600 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-400'
                          }`}
                          title="Marcar como concluída"
                        >
                          <Clock className="h-4 w-4 shrink-0 group-hover/check:hidden" />
                          <CheckCircle2 className="hidden group-hover/check:block h-4.5 w-4.5 text-emerald-500" />
                        </button>
                      )}

                      <div>
                        <h4 className={`text-sm font-semibold text-slate-800 dark:text-slate-200 transition-all ${
                          isCompleted ? 'line-through decoration-slate-300 dark:decoration-slate-700 text-slate-400 dark:text-slate-500' : ''
                        }`}>
                          {task.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                          {task.type === 'weekly' ? 'Tarefa Recorrente Semanal' : 'Tarefa Diária'}
                        </p>
                        {item.delayReason && (
                          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-50/50 dark:bg-amber-950/10 px-2 py-0.5 rounded-md mt-1.5 border border-amber-100/30 w-fit">
                            Atraso: {item.delayReason}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Detalhes de Tempos e Botão de Editar */}
                    <div className="flex flex-wrap items-center gap-3 sm:ml-auto text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {/* Data de Execução */}
                      <span className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-md px-2 py-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {formatCompletionFullDate(date)}
                      </span>

                      {/* Horário Planejado */}
                      <span className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-md px-2 py-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        Planejado: {task.hour}{task.endHour ? ` - ${task.endHour}` : ''}
                      </span>

                      {/* Horário Concluído ou pendente status */}
                      {isCompleted ? (
                        <span className="flex items-center gap-1 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 rounded-md px-2 py-1">
                          <Sparkles className="h-3.5 w-3.5" />
                          Feito às {item.completedTime || formatCompletionTime(item.completedAt!)}
                        </span>
                      ) : item.isActualPending ? (
                        <span className="flex items-center gap-1 bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 rounded-md px-2 py-1">
                          <AlertCircle className="h-3.5 w-3.5 animate-pulse" />
                          Pendente
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 rounded-md px-2 py-1">
                          <XCircle className="h-3.5 w-3.5" />
                          Não Concluída
                        </span>
                      )}

                      {/* Botão de Editar Tarefa */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditTask(task, date);
                        }}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:border-blue-900 transition-colors cursor-pointer shrink-0"
                        title="Editar Dados da Tarefa"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            /* Estado Vazio */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 flex flex-col items-center justify-center text-center"
            >
              <div className="h-16 w-16 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4 border border-slate-100/30 dark:border-slate-800/30">
                <Inbox className="h-8 w-8" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Nenhum registro encontrado</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto font-medium">
                {statusFilter === 'all'
                  ? 'Nenhuma tarefa agendada neste período foi encontrada.'
                  : statusFilter === 'completed'
                  ? 'Nenhuma tarefa concluída neste período foi encontrada.'
                  : 'Nenhuma tarefa pendente neste período foi encontrada.'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
