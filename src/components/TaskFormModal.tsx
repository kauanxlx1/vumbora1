import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, Bookmark, AlignLeft, Check } from 'lucide-react';
import { Task } from '../types';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskData: {
    id?: string;
    name: string;
    hour: string;
    endHour?: string;
    type: 'daily' | 'weekly';
    date?: string;
    daysOfWeek?: number[];
    description?: string;
    color?: string;
    startDate?: string;
    endDate?: string;
    historyCompleted?: boolean;
    completedTime?: string;
    delayReason?: string;
  }) => void;
  taskToEdit?: Task | null;
  prefilledHour?: string | null;
  defaultDate: string; // YYYY-MM-DD
  historyEditDate?: string | null;
  isCompletedOnHistoryEditDate?: boolean;
  historyCompletionTime?: string;
  historyDelayReason?: string;
}

const COLORS = [
  { value: '#10b981', name: 'Esmeralda', bgClass: 'bg-emerald-500' },
  { value: '#3b82f6', name: 'Azul', bgClass: 'bg-blue-500' },
  { value: '#8b5cf6', name: 'Violeta', bgClass: 'bg-violet-500' },
  { value: '#f59e0b', name: 'Âmbar', bgClass: 'bg-amber-500' },
  { value: '#f43f5e', name: 'Rosa', bgClass: 'bg-rose-500' },
  { value: '#64748b', name: 'Cinza', bgClass: 'bg-slate-500' },
];

const DAYS_OF_WEEK = [
  { value: 1, label: 'Segunda', short: 'Seg' },
  { value: 2, label: 'Terça', short: 'Ter' },
  { value: 3, label: 'Quarta', short: 'Qua' },
  { value: 4, label: 'Quinta', short: 'Qui' },
  { value: 5, label: 'Sexta', short: 'Sex' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
  { value: 0, label: 'Domingo', short: 'Dom' },
];

export default function TaskFormModal({
  isOpen,
  onClose,
  onSubmit,
  taskToEdit,
  prefilledHour,
  defaultDate,
  historyEditDate,
  isCompletedOnHistoryEditDate,
  historyCompletionTime,
  historyDelayReason,
}: TaskFormModalProps) {
  const [name, setName] = useState('');
  const [hour, setHour] = useState('09:00');
  const [endHour, setEndHour] = useState('');
  const [type, setType] = useState<'daily' | 'weekly'>('daily');
  const [date, setDate] = useState(defaultDate);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]); // default Seg-Sex
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [historyCompleted, setHistoryCompleted] = useState(false);
  const [completedTime, setCompletedTime] = useState('');
  const [delayReason, setDelayReason] = useState('');
  const [errors, setErrors] = useState<{ name?: string; hour?: string; daysOfWeek?: string }>({});

  useEffect(() => {
    if (isOpen) {
      if (taskToEdit) {
        setName(taskToEdit.name);
        setHour(taskToEdit.hour);
        setEndHour(taskToEdit.endHour || '');
        setType(taskToEdit.type);
        if (taskToEdit.date) setDate(taskToEdit.date);
        if (taskToEdit.daysOfWeek) setDaysOfWeek(taskToEdit.daysOfWeek);
        setDescription(taskToEdit.description || '');
        setColor(taskToEdit.color || '#3b82f6');
        setStartDate(taskToEdit.startDate || '');
        setEndDate(taskToEdit.endDate || '');
      } else {
        setName('');
        setHour(prefilledHour || '09:00');
        setEndHour('');
        setType('daily');
        setDate(defaultDate);
        setDaysOfWeek([1, 2, 3, 4, 5]);
        setDescription('');
        setColor(COLORS[Math.floor(Math.random() * COLORS.length)].value);
        setStartDate('');
        setEndDate('');
      }
      setHistoryCompleted(isCompletedOnHistoryEditDate || false);
      setCompletedTime(historyCompletionTime || taskToEdit?.hour || '12:00');
      setDelayReason(historyDelayReason || '');
      setErrors({});
    }
  }, [isOpen, taskToEdit, prefilledHour, defaultDate, isCompletedOnHistoryEditDate, historyCompletionTime, historyDelayReason]);

  const handleToggleDay = (dayValue: number) => {
    if (daysOfWeek.includes(dayValue)) {
      setDaysOfWeek(daysOfWeek.filter((d) => d !== dayValue));
    } else {
      setDaysOfWeek([...daysOfWeek, dayValue].sort());
    }
  };

  const handleSelectAllDays = () => {
    if (daysOfWeek.length === 7) {
      setDaysOfWeek([]);
    } else {
      setDaysOfWeek([1, 2, 3, 4, 5, 6, 0]);
    }
  };

  const handleSelectWeekdays = () => {
    setDaysOfWeek([1, 2, 3, 4, 5]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (historyEditDate) {
      onSubmit({
        id: taskToEdit?.id,
        name: name.trim() || taskToEdit?.name || '',
        hour: hour || taskToEdit?.hour || '09:00',
        endHour: endHour || undefined,
        type: type || taskToEdit?.type || 'daily',
        date: type === 'daily' ? date : undefined,
        daysOfWeek: type === 'weekly' ? daysOfWeek : undefined,
        description: description.trim() || undefined,
        color,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        historyCompleted: historyCompleted,
        completedTime: completedTime.trim() || undefined,
        delayReason: delayReason.trim() || undefined,
      });
      onClose();
      return;
    }

    const newErrors: { name?: string; hour?: string; daysOfWeek?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'O nome da tarefa é obrigatório.';
    }
    if (!hour) {
      newErrors.hour = 'O horário é obrigatório.';
    }

    // Validação para evitar agendar tarefas no passado (apenas para tarefas diárias se data/hora forem alteradas ou novas)
    const isTimeOrDateChanged = !taskToEdit || taskToEdit.hour !== hour || (type === 'daily' && taskToEdit.date !== date);
    if (type === 'daily' && date && hour && isTimeOrDateChanged) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      if (date < todayStr) {
        newErrors.hour = 'Não é possível agendar uma tarefa para uma data que já passou.';
      } else if (date === todayStr) {
        const currentHourStr = String(now.getHours()).padStart(2, '0');
        const currentMinStr = String(now.getMinutes()).padStart(2, '0');
        const currentTimeStr = `${currentHourStr}:${currentMinStr}`;
        if (hour < currentTimeStr) {
          newErrors.hour = 'Não é possível agendar uma tarefa para um horário que já passou hoje.';
        }
      }
    }

    if (endHour && hour) {
      const [startH, startM] = hour.split(':').map(Number);
      const [endH, endM] = endHour.split(':').map(Number);
      const startTotal = startH * 60 + startM;
      const endTotal = endH * 60 + endM;
      if (endTotal <= startTotal) {
        newErrors.hour = 'O horário de término deve ser após o horário de início.';
      }
    }
    if (type === 'weekly' && daysOfWeek.length === 0) {
      newErrors.daysOfWeek = 'Selecione pelo menos um dia da semana.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      id: taskToEdit?.id,
      name: name.trim(),
      hour,
      endHour: endHour || undefined,
      type,
      date: type === 'daily' ? date : undefined,
      daysOfWeek: type === 'weekly' ? daysOfWeek : undefined,
      description: description.trim() || undefined,
      color,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      historyCompleted: historyEditDate ? historyCompleted : undefined,
    });
    onClose();
  };

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

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative w-full max-w-lg max-h-[90vh] md:max-h-none overflow-y-auto md:overflow-visible rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Bookmark className="h-5 w-5" style={{ color }} />
                {taskToEdit ? 'Editar Tarefa' : 'Criar Nova Tarefa'}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {historyEditDate ? (
                <div className="space-y-4">
                  {/* Informação do dia */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100/60 dark:border-slate-800/60 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
                      Editando histórico do dia: <strong className="text-slate-900 dark:text-white">{historyEditDate}</strong>
                    </span>
                  </div>

                  {/* 1. Se foi concluída? */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Tarefa Concluída neste dia?
                    </label>
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg w-fit">
                      <button
                        type="button"
                        onClick={() => setHistoryCompleted(true)}
                        className={`px-4 py-1.5 text-xs font-black rounded-md transition-all cursor-pointer ${
                          historyCompleted
                            ? 'bg-emerald-500 text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                        }`}
                      >
                        Sim
                      </button>
                      <button
                        type="button"
                        onClick={() => setHistoryCompleted(false)}
                        className={`px-4 py-1.5 text-xs font-black rounded-md transition-all cursor-pointer ${
                          !historyCompleted
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                        }`}
                      >
                        Não
                      </button>
                    </div>
                  </div>

                  {/* 2. Quando foi realizada? */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-slate-400" />
                      Quando foi realizada?
                    </label>
                    <input
                      type="time"
                      value={completedTime}
                      onChange={(e) => setCompletedTime(e.target.value)}
                      disabled={!historyCompleted}
                      className={`w-full max-w-[150px] rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:border-blue-500 focus:ring-blue-100 dark:text-white dark:bg-slate-850 dark:border-slate-700 dark:focus:ring-slate-800 ${
                        !historyCompleted ? 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-900' : ''
                      }`}
                    />
                    {!historyCompleted && (
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        Marque como concluída para poder definir o horário de conclusão.
                      </p>
                    )}
                  </div>

                  {/* 3. Por quê atrasou para fazer? */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <AlignLeft className="h-4 w-4 text-slate-400" />
                      Por quê atrasou para fazer? <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">(Opcional)</span>
                    </label>
                    <textarea
                      value={delayReason}
                      onChange={(e) => setDelayReason(e.target.value)}
                      placeholder="Ex: Tive um imprevisto, internet caiu, compromisso de trabalho..."
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:border-blue-500 focus:ring-blue-100 dark:text-white dark:bg-slate-850 dark:border-slate-700 dark:focus:ring-slate-800 resize-none"
                    />
                  </div>

                  {/* Footer / Ações do Histórico */}
                  <div className="flex gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 mt-6">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 rounded-xl text-white py-2.5 text-sm font-semibold bg-emerald-500 shadow-md shadow-emerald-500/10 hover:shadow-lg transition-all focus:ring-2 focus:ring-emerald-300 hover:bg-emerald-600 cursor-pointer"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Nome */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Nome da Tarefa <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (errors.name) setErrors({ ...errors, name: undefined });
                        }}
                        placeholder="Ex: Academia, Estudar TypeScript, Reunião"
                        className={`w-full rounded-xl border px-3.5 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 dark:text-white dark:bg-slate-800 ${
                          errors.name
                            ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200 dark:border-rose-900 dark:focus:ring-rose-950'
                            : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100 dark:border-slate-700 dark:focus:border-blue-500 dark:focus:ring-slate-800'
                        }`}
                      />
                    </div>
                    {errors.name && (
                      <p className="mt-1 text-xs text-rose-500 font-medium">{errors.name}</p>
                    )}
                  </div>

                  {/* Grid: Horário Início, Horário Término, e Tipo */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Horário de Início */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-slate-400" />
                        Início <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={hour}
                        onChange={(e) => {
                          setHour(e.target.value);
                          if (errors.hour) setErrors({ ...errors, hour: undefined });
                        }}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:border-blue-500 focus:ring-blue-100 dark:text-white dark:bg-slate-800 dark:border-slate-700 dark:focus:ring-slate-800"
                      />
                      {errors.hour && (
                        <p className="mt-1 text-xs text-rose-500 font-medium">{errors.hour}</p>
                      )}
                    </div>

                    {/* Horário de Término */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-slate-400" />
                        Término <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">(Opcional)</span>
                      </label>
                      <input
                        type="time"
                        value={endHour}
                        onChange={(e) => setEndHour(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:border-blue-500 focus:ring-blue-100 dark:text-white dark:bg-slate-800 dark:border-slate-700 dark:focus:ring-slate-800"
                      />
                    </div>

                    {/* Tipo de Tarefa */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Tipo de Tarefa <span className="text-rose-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                        <button
                          type="button"
                          onClick={() => setType('daily')}
                          className={`rounded-lg py-1.5 text-xs font-medium transition-all cursor-pointer ${
                            type === 'daily'
                              ? 'bg-white text-slate-950 shadow-xs dark:bg-slate-700 dark:text-white'
                              : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
                          }`}
                        >
                          Diária
                        </button>
                        <button
                          type="button"
                          onClick={() => setType('weekly')}
                          className={`rounded-lg py-1.5 text-xs font-medium transition-all cursor-pointer ${
                            type === 'weekly'
                              ? 'bg-white text-slate-950 shadow-xs dark:bg-slate-700 dark:text-white'
                              : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
                          }`}
                        >
                          Semanal
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Condicional: Configurações do Tipo */}
                  <motion.div
                    layout="position"
                    transition={{ duration: 0.2 }}
                    className="border-t border-slate-50 pt-3 dark:border-slate-800/50"
                  >
                    {type === 'daily' ? (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          Data da Tarefa
                        </label>
                        <input
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:border-blue-500 focus:ring-blue-100 dark:text-white dark:bg-slate-800 dark:border-slate-700 dark:focus:ring-slate-800"
                        />
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Dias de Repetição
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handleSelectWeekdays}
                              className="text-[10px] text-blue-600 hover:underline font-medium dark:text-blue-400 cursor-pointer"
                            >
                              Seg-Sex
                            </button>
                            <button
                              type="button"
                              onClick={handleSelectAllDays}
                              className="text-[10px] text-blue-600 hover:underline font-medium dark:text-blue-400 cursor-pointer"
                            >
                              {daysOfWeek.length === 7 ? 'Nenhum' : 'Todos'}
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-1.5 justify-between">
                          {DAYS_OF_WEEK.map((day) => {
                            const isSelected = daysOfWeek.includes(day.value);
                            return (
                              <button
                                key={day.value}
                                type="button"
                                onClick={() => {
                                  handleToggleDay(day.value);
                                  if (errors.daysOfWeek) setErrors({ ...errors, daysOfWeek: undefined });
                                }}
                                className={`flex-1 min-w-[42px] py-2 text-xs font-semibold rounded-lg border transition-all text-center cursor-pointer ${
                                  isSelected
                                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-950 dark:border-white'
                                    : 'bg-transparent text-slate-600 border-slate-200 hover:bg-slate-50 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-800'
                                }`}
                              >
                                {day.short}
                              </button>
                            );
                          })}
                        </div>
                        {errors.daysOfWeek && (
                          <p className="mt-1 text-xs text-rose-500 font-medium">{errors.daysOfWeek}</p>
                        )}
                      </div>
                    )}
                  </motion.div>

                  {/* Período de Validade Opcional */}
                  <div className="border-t border-slate-50 pt-3 dark:border-slate-800/50 space-y-2">
                    <span className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Período de Validade (Opcional)
                    </span>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          Início
                        </label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:border-blue-500 focus:ring-blue-100 dark:text-white dark:bg-slate-800 dark:border-slate-700 dark:focus:ring-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          Fim
                        </label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:border-blue-500 focus:ring-blue-100 dark:text-white dark:bg-slate-800 dark:border-slate-700 dark:focus:ring-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Descrição */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                      <AlignLeft className="h-4 w-4 text-slate-400" />
                      Descrição <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">(Opcional)</span>
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ex: Detalhes, links, lembretes, passos a seguir..."
                      rows={2}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:border-blue-500 focus:ring-blue-100 dark:text-white dark:bg-slate-800 dark:border-slate-700 dark:focus:ring-slate-800 resize-none"
                    />
                  </div>

                  {/* Cor */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Cor de Identificação
                    </label>
                    <div className="flex gap-2.5">
                      {COLORS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setColor(c.value)}
                          className={`h-7 w-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer ${c.bgClass}`}
                          title={c.name}
                        >
                          {color === c.value && (
                            <Check className="h-4 w-4 text-white drop-shadow-xs" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Footer / Ações */}
                  <div className="flex gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 mt-6">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 rounded-xl text-white py-2.5 text-sm font-semibold shadow-md shadow-blue-500/10 hover:shadow-lg transition-all focus:ring-2 focus:ring-blue-300 cursor-pointer"
                      style={{ backgroundColor: color }}
                    >
                      {taskToEdit ? 'Salvar Alterações' : 'Criar Tarefa'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
