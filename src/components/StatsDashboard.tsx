import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle, Clock, Calendar, Percent, TrendingUp, AlertCircle } from 'lucide-react';
import { Task, TaskCompletion } from '../types';
import { formatDateString, getWeekRange, isTaskActiveOnDay, getDayOfWeekName } from '../utils/dateUtils';

interface StatsDashboardProps {
  tasks: Task[];
  completions: TaskCompletion[];
  currentDate: Date;
}

export default function StatsDashboard({ tasks, completions, currentDate }: StatsDashboardProps) {
  const currentDateStr = formatDateString(currentDate);
  const isToday = currentDateStr === formatDateString(new Date());

  // --- ESTATÍSTICAS DE HOJE ---
  const activeToday = tasks.filter((t) => isTaskActiveOnDay(t, currentDateStr));
  const completedTodayCount = activeToday.filter((t) =>
    completions.some((c) => c.taskId === t.id && c.date === currentDateStr)
  ).length;
  const pendingTodayCount = activeToday.length - completedTodayCount;
  const progressToday = activeToday.length > 0 ? Math.round((completedTodayCount / activeToday.length) * 100) : 0;

  // --- ESTATÍSTICAS DA SEMANA ---
  const { start: weekStart } = getWeekRange(currentDate);
  const weekDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    weekDays.push(d);
  }

  let totalWeekCount = 0;
  let completedWeekCount = 0;

  weekDays.forEach((day) => {
    const dateStr = formatDateString(day);
    const activeOnDay = tasks.filter((t) => isTaskActiveOnDay(t, dateStr));
    const completedOnDay = activeOnDay.filter((t) =>
      completions.some((c) => c.taskId === t.id && c.date === dateStr)
    );

    totalWeekCount += activeOnDay.length;
    completedWeekCount += completedOnDay.length;
  });

  const pendingWeekCount = totalWeekCount - completedWeekCount;
  const progressWeek = totalWeekCount > 0 ? Math.round((completedWeekCount / totalWeekCount) * 100) : 0;

  // --- ESTATÍSTICAS DA SEMANA ANTERIOR ---
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(weekStart.getDate() - 7);
  const prevWeekDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(prevWeekStart);
    d.setDate(prevWeekStart.getDate() + i);
    prevWeekDays.push(d);
  }

  let totalPrevWeekCount = 0;
  let completedPrevWeekCount = 0;

  prevWeekDays.forEach((day) => {
    const dateStr = formatDateString(day);
    const activeOnDay = tasks.filter((t) => isTaskActiveOnDay(t, dateStr));
    const completedOnDay = activeOnDay.filter((t) =>
      completions.some((c) => c.taskId === t.id && c.date === dateStr)
    );

    totalPrevWeekCount += activeOnDay.length;
    completedPrevWeekCount += completedOnDay.length;
  });

  const pendingPrevWeekCount = totalPrevWeekCount - completedPrevWeekCount;
  const progressPrevWeek = totalPrevWeekCount > 0 ? Math.round((completedPrevWeekCount / totalPrevWeekCount) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Progresso Geral */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs dark:bg-slate-900 dark:border-slate-800 md:col-span-3 flex flex-col sm:flex-row items-center gap-5">
        <div className="relative shrink-0 flex items-center justify-center">
          {/* Circular Progress */}
          <svg className="w-20 h-20 transform -rotate-90">
            <circle
              cx="40"
              cy="40"
              r="34"
              className="stroke-slate-100 dark:stroke-slate-800"
              strokeWidth="6"
              fill="transparent"
            />
            <motion.circle
              cx="40"
              cy="40"
              r="34"
              className="stroke-blue-500"
              strokeWidth="6"
              fill="transparent"
              strokeDasharray={213.6}
              initial={{ strokeDashoffset: 213.6 }}
              animate={{ strokeDashoffset: 213.6 - (213.6 * progressToday) / 100 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute font-mono text-base font-bold text-slate-800 dark:text-white">
            {progressToday}%
          </div>
        </div>

        <div className="flex-1 text-center sm:text-left">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-center sm:justify-start gap-1.5">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            Progresso de {isToday ? 'Hoje' : getDayOfWeekName(currentDate)}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
            {progressToday === 100
              ? `Incrível! Você concluiu todas as tarefas agendadas para ${isToday ? 'hoje' : getDayOfWeekName(currentDate).toLowerCase()}. Continue assim!`
              : progressToday >= 50
              ? `Excelente ritmo! Você já passou da metade das tarefas planejadas para ${isToday ? 'hoje' : getDayOfWeekName(currentDate).toLowerCase()}.`
              : activeToday.length > 0
              ? 'Dia iniciado! Complete suas atividades para ver seu indicador de produtividade subir.'
              : `Nenhuma tarefa programada para ${isToday ? 'hoje' : getDayOfWeekName(currentDate).toLowerCase()}. Aproveite para planejar o seu dia!`}
          </p>
          
          {/* Mini Stats Row */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 justify-center sm:justify-start text-xs font-semibold text-slate-400">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              {activeToday.length} {isToday ? 'Agendadas' : 'Planejadas'}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {completedTodayCount} Concluídas
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              {pendingTodayCount} Pendentes
            </span>
          </div>
        </div>
      </div>

      {/* Hoje Card */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs dark:bg-slate-900 dark:border-slate-800 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{isToday ? 'Hoje' : getDayOfWeekName(currentDate)}</span>
            <div className="p-1.5 bg-blue-50 text-blue-500 rounded-lg dark:bg-blue-950/40 dark:text-blue-400">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">{completedTodayCount}</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">de {activeToday.length} concluídas</span>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-400">Tarefas Pendentes</span>
            <span className="text-amber-500 font-mono">{pendingTodayCount}</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden dark:bg-slate-800">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressToday}%` }}
            />
          </div>
        </div>
      </div>

      {/* Semana Card */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs dark:bg-slate-900 dark:border-slate-800 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Semana Atual</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-500 rounded-lg dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle className="h-4 w-4" />
            </div>
          </div>
          
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">{completedWeekCount}</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">de {totalWeekCount} concluídas</span>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-400">Pendências Semanais</span>
            <span className="text-indigo-500 font-mono">{pendingWeekCount}</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden dark:bg-slate-800">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressWeek}%` }}
            />
          </div>
        </div>
      </div>

      {/* Aproveitamento Card */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs dark:bg-slate-900 dark:border-slate-800 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aproveitamento</span>
            <div className="p-1.5 bg-indigo-50 text-indigo-500 rounded-lg dark:bg-indigo-950/40 dark:text-indigo-400">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">{progressWeek}%</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">de eficácia semanal</span>
          </div>
        </div>

        <div className="mt-5 flex gap-2 items-center bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100/50 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
          <AlertCircle className="h-4 w-4 text-indigo-500 shrink-0" />
          <span>Fórmulas automáticas calculam seu rendimento com base nas tarefas recorrentes ativas.</span>
        </div>
      </div>

      {/* Comparativo de Semanas com Gráficos de Rosca */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6 shadow-xs dark:bg-slate-900 dark:border-slate-800 md:col-span-3">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-5 mb-6 dark:border-slate-800/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Taxa de Conclusão Semanal (Comparativo de Rosca)
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Comparação detalhada de tarefas concluídas vs. pendentes com a semana anterior
            </p>
          </div>
          
          {/* Badge Indicador de Evolução */}
          {totalWeekCount > 0 && totalPrevWeekCount > 0 ? (
            <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 ${
              progressWeek >= progressPrevWeek 
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' 
                : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'
            }`}>
              {progressWeek >= progressPrevWeek ? (
                <span>Evolução: +{progressWeek - progressPrevWeek}% vs semana passada!</span>
              ) : (
                <span>Evolução: {progressWeek - progressPrevWeek}% vs semana passada.</span>
              )}
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-50 text-slate-400 dark:bg-slate-800/40 dark:text-slate-500 shrink-0">
              Sem histórico de comparação ainda.
            </div>
          )}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Gráficos de Rosca */}
          <div className="lg:col-span-8 flex flex-col sm:flex-row items-center justify-around gap-8 py-2">
            
            {/* Rosca 1: Semana Atual */}
            <div className="flex flex-col items-center text-center">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-4 uppercase tracking-wider">
                Semana Atual
              </span>
              <div className="relative flex items-center justify-center">
                {/* SVG Donut */}
                <svg className="w-36 h-36 transform -rotate-90">
                  {/* Track base */}
                  <circle
                    cx="72"
                    cy="72"
                    r="58"
                    className="stroke-slate-100 dark:stroke-slate-800"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  {/* Pending track (Amber) - represent total amount */}
                  {totalWeekCount > 0 && (
                    <circle
                      cx="72"
                      cy="72"
                      r="58"
                      className="stroke-amber-400 dark:stroke-amber-500/50"
                      strokeWidth="10"
                      fill="transparent"
                    />
                  )}
                  {/* Completed segment (Emerald) */}
                  {totalWeekCount > 0 && (
                    <motion.circle
                      cx="72"
                      cy="72"
                      r="58"
                      className="stroke-emerald-500"
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={364.4}
                      initial={{ strokeDashoffset: 364.4 }}
                      animate={{ strokeDashoffset: 364.4 - (364.4 * progressWeek) / 100 }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      strokeLinecap="round"
                    />
                  )}
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-xl font-extrabold text-slate-900 dark:text-white font-mono leading-none">
                    {progressWeek}%
                  </span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-extrabold tracking-wider mt-1">
                    Concluído
                  </span>
                </div>
              </div>

              {/* Legendas Semana Atual */}
              <div className="mt-4 flex gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  {completedWeekCount} Feitas
                </span>
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  {pendingWeekCount} Pendentes
                </span>
              </div>
            </div>

            {/* Rosca 2: Semana Anterior */}
            <div className="flex flex-col items-center text-center">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-4 uppercase tracking-wider">
                Semana Anterior
              </span>
              <div className="relative flex items-center justify-center">
                {/* SVG Donut */}
                <svg className="w-36 h-36 transform -rotate-90">
                  {/* Track base */}
                  <circle
                    cx="72"
                    cy="72"
                    r="58"
                    className="stroke-slate-100 dark:stroke-slate-800"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  {/* Pending track (Amber) */}
                  {totalPrevWeekCount > 0 && (
                    <circle
                      cx="72"
                      cy="72"
                      r="58"
                      className="stroke-amber-400/60 dark:stroke-amber-500/30"
                      strokeWidth="10"
                      fill="transparent"
                    />
                  )}
                  {/* Completed segment (Emerald/Muted green) */}
                  {totalPrevWeekCount > 0 && (
                    <motion.circle
                      cx="72"
                      cy="72"
                      r="58"
                      className="stroke-emerald-500/60 dark:stroke-emerald-500/40"
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={364.4}
                      initial={{ strokeDashoffset: 364.4 }}
                      animate={{ strokeDashoffset: 364.4 - (364.4 * progressPrevWeek) / 100 }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      strokeLinecap="round"
                    />
                  )}
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-xl font-bold text-slate-500 dark:text-slate-400 font-mono leading-none">
                    {progressPrevWeek}%
                  </span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-extrabold tracking-wider mt-1">
                    Concluído
                  </span>
                </div>
              </div>

              {/* Legendas Semana Anterior */}
              <div className="mt-4 flex gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
                  {completedPrevWeekCount} Feitas
                </span>
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
                  {pendingPrevWeekCount} Pendentes
                </span>
              </div>
            </div>

          </div>

          {/* Métricas & Insights Card */}
          <div className="lg:col-span-4 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100/60 dark:border-slate-800 p-5 rounded-2xl flex flex-col justify-between h-full min-h-[220px]">
            <div>
              <h4 className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
                Análise Comparativa
              </h4>
              
              <div className="space-y-3.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Total Planejado</span>
                  <div className="font-bold text-slate-700 dark:text-slate-300 font-mono flex items-center gap-1.5">
                    <span>{totalWeekCount}</span>
                    <span className="text-[10px] font-normal text-slate-400">vs {totalPrevWeekCount}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Concluídas</span>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1.5">
                    <span>{completedWeekCount}</span>
                    <span className="text-[10px] font-normal text-slate-400">vs {completedPrevWeekCount}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Pendentes</span>
                  <div className="font-bold text-amber-500 font-mono flex items-center gap-1.5">
                    <span>{pendingWeekCount}</span>
                    <span className="text-[10px] font-normal text-slate-400">vs {pendingPrevWeekCount}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100/80 dark:border-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400">
              <div className="flex items-start gap-1.5">
                <AlertCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <span>
                  {totalWeekCount === 0 && totalPrevWeekCount === 0
                    ? 'Comece a agendar e concluir tarefas para acompanhar sua evolução de desempenho.'
                    : progressWeek > progressPrevWeek
                    ? 'Foco excelente! Você está com uma produtividade e aproveitamento superiores aos da semana passada.'
                    : progressWeek === progressPrevWeek
                    ? 'Desempenho consistente! Você está mantendo exatamente o mesmo ritmo de entrega.'
                    : 'Abaixo da meta. Tente redistribuir ou simplificar suas tarefas pendentes nas próximas agendas.'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
