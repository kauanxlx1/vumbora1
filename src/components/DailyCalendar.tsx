import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Edit2, Trash2, CheckCircle2, Clock, CalendarDays, HelpCircle } from 'lucide-react';
import { Task, TaskCompletion, TaskFilter } from '../types';
import { isTaskOverdue, formatDateString, getDayOfWeekName } from '../utils/dateUtils';

interface DailyCalendarProps {
  activeTasks: Task[];
  completions: TaskCompletion[];
  currentDateStr: string; // YYYY-MM-DD
  onToggleComplete: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onQuickCreate: (hour: string) => void;
  searchQuery: string;
  activeFilter: TaskFilter;
  liveClock?: Date;
}

export default function DailyCalendar({
  activeTasks,
  completions,
  currentDateStr,
  onToggleComplete,
  onEditTask,
  onDeleteTask,
  onQuickCreate,
  searchQuery,
  activeFilter,
  liveClock,
}: DailyCalendarProps) {
  const [showFullDay, setShowFullDay] = useState(false);

  // Define as horas que serão renderizadas
  const startHour = showFullDay ? 0 : 6;
  const endHour = showFullDay ? 23 : 22;
  const hoursArray = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

  // Filtra as tarefas ativas hoje baseado na busca e no filtro ativo
  const filteredTasks = activeTasks.filter((task) => {
    // Busca por texto (nome ou descrição)
    const matchesSearch =
      task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    const isCompleted = completions.some(
      (c) => c.taskId === task.id && c.date === currentDateStr
    );

    // Se a tarefa não foi feita e já passou do horário planejado, ela é enviada diretamente ao histórico
    const liveClockVal = liveClock || new Date();
    if (!isCompleted && isTaskOverdue(task, currentDateStr, liveClockVal)) {
      return false;
    }

    // Filtros rápidos
    if (activeFilter === 'pending') return !isCompleted;
    if (activeFilter === 'completed') return isCompleted;
    if (activeFilter === 'daily') return task.type === 'daily';
    if (activeFilter === 'weekly') return task.type === 'weekly';

    return true;
  });

  // Agrupa as tarefas por hora de início (0-23)
  const hourTasksMap = filteredTasks.reduce((acc, task) => {
    const [hStr] = task.hour.split(':');
    const hNum = parseInt(hStr, 10);
    if (!acc[hNum]) {
      acc[hNum] = [];
    }
    acc[hNum].push(task);
    return acc;
  }, {} as { [hour: number]: Task[] });

  // Ordena tarefas de cada hora por minutos
  Object.keys(hourTasksMap).forEach((h) => {
    hourTasksMap[Number(h)].sort((a, b) => {
      const aMin = parseInt(a.hour.split(':')[1], 10);
      const bMin = parseInt(b.hour.split(':')[1], 10);
      return aMin - bMin;
    });
  });

  // Determina o nome do dia da semana selecionado
  const dateObj = new Date(currentDateStr + 'T00:00:00');
  const dayName = getDayOfWeekName(dateObj);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-6 shadow-xs dark:bg-slate-900 dark:border-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-50 pb-4 dark:border-slate-800/50">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Cronograma de {dayName}
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Clique em qualquer horário para adicionar uma tarefa diretamente
          </p>
        </div>
        
        <button
          onClick={() => setShowFullDay(!showFullDay)}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all self-start sm:self-center"
        >
          {showFullDay ? 'Ocultar Horários Iniciais/Finais' : 'Mostrar 24 Horas'}
        </button>
      </div>

      {/* Timeline */}
      <div className="relative flex flex-col space-y-1.5">
        {hoursArray.map((hour) => {
          const hourStr = String(hour).padStart(2, '0') + ':00';
          const tasksInHour = hourTasksMap[hour] || [];

          return (
            <div
              key={hour}
              className="group flex gap-3 min-h-[56px] py-1 border-b border-slate-50 last:border-0 dark:border-slate-800/30 items-start hover:bg-slate-50/40 dark:hover:bg-slate-800/10 rounded-lg px-2 -mx-2 transition-colors"
            >
              {/* Rótulo da Hora */}
              <div className="w-14 shrink-0 text-right pr-2 select-none">
                <span className="font-mono text-xs font-semibold text-slate-400 dark:text-slate-500 block mt-1">
                  {hourStr}
                </span>
              </div>

              {/* Bloco de Conteúdo */}
              <div className="flex-1 min-h-[44px] relative flex flex-col gap-2 justify-center">
                <AnimatePresence initial={false}>
                  {tasksInHour.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
                      {tasksInHour.map((task) => {
                        const isCompleted = completions.some(
                          (c) => c.taskId === task.id && c.date === currentDateStr
                        );

                        const [taskH, taskM] = task.hour.split(':').map(Number);
                        const liveClockVal = liveClock || new Date();
                        const currentH = liveClockVal.getHours();
                        const currentM = liveClockVal.getMinutes();
                        const taskMinutes = taskH * 60 + taskM;
                        const currentMinutes = currentH * 60 + currentM;
                        const diffMinutes = currentMinutes - taskMinutes;
                        
                        const isToday = currentDateStr === (liveClockVal ? formatDateString(liveClockVal) : '');
                        const isTolerating = isToday && !isCompleted && diffMinutes > 0 && diffMinutes <= 10;
                        const minutesLeft = 10 - diffMinutes;
                        
                        return (
                          <motion.div
                            key={task.id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            transition={{ duration: 0.15 }}
                            className={`relative rounded-xl p-3 border text-left transition-all group/card ${
                              isCompleted
                                ? 'bg-slate-50/50 border-slate-200 dark:bg-slate-900/40 dark:border-slate-800 opacity-60'
                                : isTolerating
                                ? 'bg-amber-50/40 border-amber-300 dark:bg-amber-950/20 dark:border-amber-900/50 hover:border-amber-400 shadow-xs'
                                : 'bg-white border-slate-100 shadow-xs dark:bg-slate-800 dark:border-slate-700/60 hover:shadow-md dark:hover:border-slate-600'
                            }`}
                            style={{
                              borderLeftWidth: '4px',
                              borderLeftColor: task.color || '#3b82f6',
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              {/* Lado Esquerdo: Checkbox + Título */}
                              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleComplete(task.id);
                                  }}
                                  className={`mt-0.5 shrink-0 h-5 w-5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                                    isCompleted
                                      ? 'bg-emerald-500 border-emerald-500 text-white dark:bg-emerald-600 dark:border-emerald-600'
                                      : isTolerating
                                      ? 'border-amber-400 hover:border-amber-500 bg-amber-50/50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                                      : 'border-slate-300 hover:border-slate-400 dark:border-slate-600 dark:hover:border-slate-500'
                                  }`}
                                  title={isCompleted ? 'Desmarcar tarefa' : 'Marcar como concluída'}
                                >
                                  {isCompleted && (
                                    <CheckCircle2 className="h-4 w-4 text-white shrink-0" />
                                  )}
                                </button>

                                <div className="min-w-0 flex-1">
                                  <h4
                                    className={`text-sm font-semibold truncate ${
                                      isCompleted
                                        ? 'line-through text-slate-400 dark:text-slate-500 font-medium'
                                        : 'text-slate-800 dark:text-white'
                                    }`}
                                  >
                                    {task.name}
                                  </h4>
                                  
                                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                    <span className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/60 rounded-md px-1.5 py-0.5">
                                      <Clock className="h-3 w-3" />
                                      {task.hour}{task.endHour ? ` - ${task.endHour}` : ''}
                                    </span>

                                    <span className={`inline-flex items-center text-[10px] font-semibold rounded-md px-1.5 py-0.5 ${
                                      task.type === 'weekly'
                                        ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                                        : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                                    }`}>
                                      {task.type === 'weekly' ? 'Semanal' : 'Diária'}
                                    </span>

                                    {task.type === 'weekly' && task.daysOfWeek && (
                                      <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">
                                        ({task.daysOfWeek.map(d => {
                                          const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                                          return days[d];
                                        }).join(', ')})
                                      </span>
                                    )}

                                    {isTolerating && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-950/60 rounded-md px-1.5 py-0.5 animate-pulse">
                                        Pendente: Expira em {minutesLeft} min
                                      </span>
                                    )}
                                  </div>

                                  {task.description && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">
                                      {task.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Lado Direito: Ações (Editar, Excluir) - Visível por padrão no mobile */}
                              <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover/card:opacity-100 lg:focus-within:opacity-100 transition-opacity ml-2 shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditTask(task);
                                  }}
                                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                  title="Editar"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteTask(task);
                                  }}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                  title="Excluir"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    // Botão rápido de adicionar na linha - Parcialmente visível no mobile por padrão
                    <button
                      onClick={() => onQuickCreate(String(hour).padStart(2, '0') + ':00')}
                      className="w-full h-8 border border-dashed border-slate-250 dark:border-slate-850 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-500 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 cursor-pointer opacity-70 lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100 transition-all text-xs font-semibold gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Adicionar tarefa às {hourStr}
                    </button>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
