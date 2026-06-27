import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTaskMonitor } from './hooks/useTaskMonitor';
  Calendar,
  Clock,
  CheckCircle2,
  BarChart2,
  History as HistoryIcon,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  User,
  Sparkles,
  Check,
  Edit2,
  Keyboard,
  Bell,
  BellOff
} from 'lucide-react';

import { Task, TaskCompletion, TaskFilter } from './types';
import { getInitialTasks, getInitialCompletions } from './data/mockTasks';
import {
  formatDateString,
  formatFullDate,
  getGreeting,
  isTaskActiveOnDay,
  getNextTask,
  getDayOfWeekName
} from './utils/dateUtils';

import TaskFormModal from './components/TaskFormModal';
import DailyCalendar from './components/DailyCalendar';
import StatsDashboard from './components/StatsDashboard';
import HistoryTab from './components/HistoryTab';
import ConfirmModal from './components/ConfirmModal';
import ShortcutsModal from './components/ShortcutsModal';
import ToastContainer, { ToastMessage } from './components/ToastContainer';

import { supabase, isSupabaseConfigured } from './lib/supabaseClient';

// Mapeadores para compatibilizar dados do banco com a nossa tipagem TypeScript
function mapDBTaskToTask(dbTask: any): Task {
  return {
    id: dbTask.id,
    name: dbTask.name,
    hour: dbTask.hour,
    endHour: dbTask.endHour || undefined,
    type: dbTask.type,
    date: dbTask.date || undefined,
    daysOfWeek: Array.isArray(dbTask.daysOfWeek) ? dbTask.daysOfWeek : undefined,
    description: dbTask.description || undefined,
    color: dbTask.color || undefined,
    createdAt: dbTask.createdAt || new Date().toISOString(),
    startDate: dbTask.startDate || undefined,
    endDate: dbTask.endDate || undefined,
  };
}

function mapDBCompletionToCompletion(dbComp: any): TaskCompletion {
  return {
    taskId: dbComp.taskId,
    date: dbComp.date,
    completedAt: dbComp.completedAt,
    completedTime: dbComp.completedTime || undefined,
    delayReason: dbComp.delayReason || undefined,
  };
}

export default function App() {
  // --- ESTADO DO USUÁRIO E TEMA ---
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('agenda_username') || 'Kauan';
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(userName);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('agenda_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    // Preferência do sistema
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });// --- EFEITO DE SINCRONIZAÇÃO DO TEMA ---
useEffect(() => {
  const root = window.document.documentElement;
  
  // Limpa as classes anteriores
  root.classList.remove('light', 'dark');
  
  // Adiciona a classe atual
  root.classList.add(theme);
  
  // Salva no localStorage para persistir
  localStorage.setItem('agenda_theme', theme);
}, [theme]);

  // --- ESTADO PRINCIPAL DE DADOS ---
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('agenda_tasks');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback se corrompido
      }
    }
    return getInitialTasks();
  });

  const [completions, setCompletions] = useState<TaskCompletion[]>(() => {
    const saved = localStorage.getItem('agenda_completions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback
      }
    }
    return getInitialCompletions();
  });// Função para exibir notificações
  const showToast = (message: string) => {
    setToasts((prev) => [...prev, { id: Date.now(), message }]);
  };

  // Monitoramento de tarefas
  const { requestNotificationPermission } = useTaskMonitor({
    tasks,
    completions,
    showToast
  });

  // --- CONTROLE DE FILTRO E DATA ---
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    // Inicializa na data atual do sistema local
    return new Date();
  });
  const [activeView, setActiveView] = useState<'agenda' | 'stats' | 'history'>('agenda');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<TaskFilter>('all');

  // --- RELÓGIO AO VIVO PARA COMPUTAÇÕES DE TEMPO ---
  const [liveClock, setLiveClock] = useState(new Date());

  // --- ESTADOS DE NOTIFICAÇÃO (TOASTS) ---
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // --- ESTADOS DE MODAL ---
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [prefilledHour, setPrefilledHour] = useState<string | null>(null);
  const [historyEditDate, setHistoryEditDate] = useState<string | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);

  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem('agenda_notifications_enabled') === 'true';
  });
  const notifiedTasksRef = React.useRef<Record<string, boolean>>({});

  // --- SINCRONIZAÇÃO COM LOCAL STORAGE ---
  useEffect(() => {
    localStorage.setItem('agenda_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('agenda_completions', JSON.stringify(completions));
  }, [completions]);

  useEffect(() => {
    localStorage.setItem('agenda_username', userName);
  }, [userName]);

  useEffect(() => {
    localStorage.setItem('agenda_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);
// --- EFEITO PARA INICIAR MONITORAMENTO ---
  useEffect(() => {
    requestNotificationPermission();
  }, [requestNotificationPermission]);
  // --- SINCRONIZAÇÃO EM TEMPO REAL COM O SUPABASE ---
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const syncInitialData = async () => {
      try {
        const { data: dbTasks, error: tError } = await supabase
          .from('tasks')
          .select('*')
          .order('hour', { ascending: true });
        
        if (tError) throw tError;
        if (dbTasks) {
          setTasks(dbTasks.map(mapDBTaskToTask));
        }

        const { data: dbCompletions, error: cError } = await supabase
          .from('completions')
          .select('*');

        if (cError) throw cError;
        if (dbCompletions) {
          setCompletions(dbCompletions.map(mapDBCompletionToCompletion));
        }

        showToast('Sincronizado com o Supabase!', 'success');
      } catch (err: any) {
        console.error('Erro de sincronização inicial com Supabase:', err);
        showToast('Erro de sincronização com Supabase. Verifique seu console.', 'error');
      }
    };

    syncInitialData();

    // Inscreve para atualizações em tempo real das tarefas
    const tasksChannel = supabase
      .channel('public:tasks')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          if (eventType === 'INSERT' || eventType === 'UPDATE') {
            const mappedTask = mapDBTaskToTask(newRecord);
            setTasks((prev) => {
              const otherTasks = prev.filter((t) => t.id !== mappedTask.id);
              return [...otherTasks, mappedTask];
            });
          } else if (eventType === 'DELETE') {
            setTasks((prev) => prev.filter((t) => t.id !== oldRecord.id));
          }
        }
      )
      .subscribe();

    // Inscreve para atualizações em tempo real das conclusões
    const completionsChannel = supabase
      .channel('public:completions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'completions' },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          if (eventType === 'INSERT' || eventType === 'UPDATE') {
            const mappedCompletion = mapDBCompletionToCompletion(newRecord);
            setCompletions((prev) => {
              const otherCompletions = prev.filter(
                (c) => !(c.taskId === mappedCompletion.taskId && c.date === mappedCompletion.date)
              );
              return [...otherCompletions, mappedCompletion];
            });
          } else if (eventType === 'DELETE') {
            const taskId = oldRecord.taskId || oldRecord.task_id;
            const date = oldRecord.date;
            if (taskId && date) {
              setCompletions((prev) =>
                prev.filter((c) => !(c.taskId === taskId && c.date === date))
              );
            } else {
              // Recarrega caso o payload de delete seja parcial
              supabase.from('completions').select('*').then(({ data }) => {
                if (data) {
                  setCompletions(data.map(mapDBCompletionToCompletion));
                }
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(completionsChannel);
    };
  }, []);

  // Atualiza relógio ao vivo a cada segundo para manter precisão e exibir horário atualizado
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveClock(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // --- AUXILIARES ---
  const showToast = (
    message: string, 
    type: 'success' | 'info' | 'error' = 'success',
    action?: { label: string; onClick: () => void }
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, action }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    showToast(`Modo ${theme === 'light' ? 'Escuro' : 'Claro'} ativado`, 'info');
  };

  // --- TRATAMENTO DE NOTIFICAÇÕES (WEB NOTIFICATIONS API) ---
  const handleToggleNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      showToast('Seu navegador não suporta notificações de sistema.', 'error');
      return;
    }

    if (notificationsEnabled) {
      setNotificationsEnabled(false);
      localStorage.setItem('agenda_notifications_enabled', 'false');
      showToast('Notificações de lembrete desativadas.', 'info');
      return;
    }

    if (Notification.permission === 'granted') {
      setNotificationsEnabled(true);
      localStorage.setItem('agenda_notifications_enabled', 'true');
      showToast('Notificações ativadas! Avisaremos você 5 minutos antes das tarefas.', 'success');
      try {
        new Notification('Agenda Inteligente', {
          body: 'Notificações ativadas com sucesso! Lembretes de 5 minutos estão ativos.',
        });
      } catch (err) {
        console.error('Erro de notificação:', err);
      }
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        localStorage.setItem('agenda_notifications_enabled', 'true');
        showToast('Notificações autorizadas e ativadas com sucesso!', 'success');
        try {
          new Notification('Agenda Inteligente', {
            body: 'Notificações ativadas! Avisaremos você 5 minutos antes das tarefas começar.',
          });
        } catch (err) {
          console.error('Erro de notificação:', err);
        }
      } else {
        showToast('Permissão para notificações negada.', 'error');
      }
    } else {
      showToast('Permissão negada anteriormente. Ative as notificações manualmente no navegador.', 'error');
    }
  };

  useEffect(() => {
    if (!notificationsEnabled) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const todayStr = formatDateString(liveClock);
    const currentH = liveClock.getHours();
    const currentM = liveClock.getMinutes();
    const currentMinutesSinceMidnight = currentH * 60 + currentM;

    // Filtra tarefas ativas hoje que ainda não foram concluídas
    const activeTasksToday = tasks.filter(t => isTaskActiveOnDay(t, todayStr));
    const pendingTasksToday = activeTasksToday.filter(
      t => !completions.some(c => c.taskId === t.id && c.date === todayStr)
    );

    pendingTasksToday.forEach((task) => {
      const [taskH, taskM] = task.hour.split(':').map(Number);
      const taskMinutesSinceMidnight = taskH * 60 + taskM;

      // Diferença em minutos
      const diffMinutes = taskMinutesSinceMidnight - currentMinutesSinceMidnight;

      // Chave de notificação para garantir disparo único
      const notificationKey = `${task.id}_${todayStr}_5min`;

      if (diffMinutes === 5 && !notifiedTasksRef.current[notificationKey]) {
        notifiedTasksRef.current[notificationKey] = true;
        try {
          const notification = new Notification(`Tarefa iniciando em 5 minutos!`, {
            body: `"${task.name}" começa às ${task.hour}.${task.description ? `\nDescrição: ${task.description}` : ''}`,
            tag: notificationKey,
          });

          notification.onclick = () => {
            window.focus();
            notification.close();
          };

          showToast(`Lembrete enviado para "${task.name}" (inicia às ${task.hour})`, 'info');
        } catch (err) {
          console.error('Erro ao disparar notificação:', err);
        }
      }
    });
  }, [liveClock, notificationsEnabled, tasks, completions]);

  // --- OPERAÇÕES COM DATA ---
  const changeDateByDays = (days: number) => {
    const next = new Date(currentDate);
    next.setDate(currentDate.getDate() + days);
    setCurrentDate(next);
  };

  const handleGoToToday = () => {
    setCurrentDate(new Date());
    showToast('Retornou para a data de hoje', 'info');
  };

  const handleDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      // Evita problemas de fuso horário definindo hora neutra local
      const [y, m, d] = e.target.value.split('-').map(Number);
      setCurrentDate(new Date(y, m - 1, d));
    }
  };

  // --- AÇÕES COM TAREFAS ---
  const handleOpenCreateModal = () => {
    setTaskToEdit(null);
    setPrefilledHour(null);
    setHistoryEditDate(null);
    setIsFormModalOpen(true);
  };

  const handleOpenQuickCreateModal = (hour: string) => {
    setTaskToEdit(null);
    setPrefilledHour(hour);
    setHistoryEditDate(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (task: Task) => {
    setTaskToEdit(task);
    setPrefilledHour(null);
    setHistoryEditDate(null);
    setIsFormModalOpen(true);
  };

  const handleOpenHistoryEditModal = (task: Task, date: string) => {
    setTaskToEdit(task);
    setPrefilledHour(null);
    setHistoryEditDate(date);
    setIsFormModalOpen(true);
  };

  const handleOpenDeleteConfirm = (task: Task) => {
    setTaskToDelete(task);
    setIsDeleteModalOpen(true);
  };

  const handleSaveTask = async (taskData: {
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
  }) => {
    let savedTaskId = taskData.id;
    let newTaskObj: Task;

    if (taskData.id) {
      // Atualização local imediata (Optimistic Update)
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskData.id
            ? {
                ...t,
                name: taskData.name,
                hour: taskData.hour,
                endHour: taskData.endHour,
                type: taskData.type,
                date: taskData.date,
                daysOfWeek: taskData.daysOfWeek,
                description: taskData.description,
                color: taskData.color,
                startDate: taskData.startDate,
                endDate: taskData.endDate,
              }
            : t
        )
      );
      // Cria o objeto atualizado
      newTaskObj = {
        id: taskData.id,
        name: taskData.name,
        hour: taskData.hour,
        endHour: taskData.endHour,
        type: taskData.type,
        date: taskData.date,
        daysOfWeek: taskData.daysOfWeek,
        description: taskData.description,
        color: taskData.color,
        createdAt: tasks.find((t) => t.id === taskData.id)?.createdAt || new Date().toISOString(),
        startDate: taskData.startDate,
        endDate: taskData.endDate,
      };
      showToast('Tarefa atualizada com sucesso', 'success');
    } else {
      // Criação local imediata (Optimistic Update)
      const generatedId = 'task-' + Math.random().toString(36).substring(2, 9);
      savedTaskId = generatedId;
      newTaskObj = {
        id: generatedId,
        name: taskData.name,
        hour: taskData.hour,
        endHour: taskData.endHour,
        type: taskData.type,
        date: taskData.date,
        daysOfWeek: taskData.daysOfWeek,
        description: taskData.description,
        color: taskData.color,
        createdAt: new Date().toISOString(),
        startDate: taskData.startDate,
        endDate: taskData.endDate,
      };
      setTasks((prev) => [...prev, newTaskObj]);
      showToast('Tarefa criada com sucesso', 'success');
    }

    // Se o Supabase estiver configurado, salvar no banco
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('tasks').upsert({
          id: newTaskObj.id,
          name: newTaskObj.name,
          hour: newTaskObj.hour,
          endHour: newTaskObj.endHour || null,
          type: newTaskObj.type,
          date: newTaskObj.date || null,
          daysOfWeek: newTaskObj.daysOfWeek || null,
          description: newTaskObj.description || null,
          color: newTaskObj.color || null,
          createdAt: newTaskObj.createdAt,
          startDate: newTaskObj.startDate || null,
          endDate: newTaskObj.endDate || null,
        });
        if (error) throw error;
      } catch (err) {
        console.error('Erro ao salvar tarefa no Supabase:', err);
        showToast('Erro de sincronização ao salvar no Supabase', 'error');
      }
    }

    // Processamento de status de conclusão específico se editado a partir do histórico
    if (historyEditDate && savedTaskId) {
      if (taskData.historyCompleted) {
        const updatedCompletion: TaskCompletion = {
          taskId: savedTaskId!,
          date: historyEditDate,
          completedAt: new Date().toISOString(),
          completedTime: taskData.completedTime,
          delayReason: taskData.delayReason,
        };
        // Atualização local imediata
        setCompletions((prev) => {
          const filtered = prev.filter((c) => !(c.taskId === savedTaskId && c.date === historyEditDate));
          return [...filtered, updatedCompletion];
        });

        if (isSupabaseConfigured()) {
          try {
            const { error } = await supabase.from('completions').upsert({
              taskId: updatedCompletion.taskId,
              date: updatedCompletion.date,
              completedAt: updatedCompletion.completedAt,
              completedTime: updatedCompletion.completedTime || null,
              delayReason: updatedCompletion.delayReason || null,
            });
            if (error) throw error;
          } catch (err) {
            console.error('Erro ao salvar conclusão no Supabase:', err);
          }
        }
        showToast('Tarefa marcada como concluída no histórico', 'success');
      } else {
        // Reverte conclusão localmente
        setCompletions((prev) =>
          prev.filter((c) => !(c.taskId === savedTaskId && c.date === historyEditDate))
        );

        if (isSupabaseConfigured()) {
          try {
            const { error } = await supabase
              .from('completions')
              .delete()
              .eq('taskId', savedTaskId)
              .eq('date', historyEditDate);
            if (error) throw error;
          } catch (err) {
            console.error('Erro ao excluir conclusão no Supabase:', err);
          }
        }
        showToast('Tarefa marcada como pendente no histórico', 'info');
      }
    }
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    const deletedId = taskToDelete.id;

    // Atualização local imediata (Optimistic Update)
    setTasks((prev) => prev.filter((t) => t.id !== deletedId));
    setCompletions((prev) => prev.filter((c) => c.taskId !== deletedId));
    showToast('Tarefa excluída', 'info');
    setTaskToDelete(null);

    // Se o Supabase estiver ativo, deleta no banco
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('tasks').delete().eq('id', deletedId);
        if (error) throw error;
      } catch (err) {
        console.error('Erro ao deletar tarefa no Supabase:', err);
        showToast('Erro ao remover do Supabase', 'error');
      }
    }
  };

  const handleToggleComplete = async (taskId: string, targetDateStr = formatDateString(currentDate), preventUndoToast = false) => {
    const isAlreadyCompleted = completions.some(
      (c) => c.taskId === taskId && c.date === targetDateStr
    );

    if (isAlreadyCompleted) {
      // Reverte conclusão localmente
      setCompletions((prev) =>
        prev.filter((c) => !(c.taskId === taskId && c.date === targetDateStr))
      );
      
      // Atualiza Supabase
      if (isSupabaseConfigured()) {
        try {
          const { error } = await supabase
            .from('completions')
            .delete()
            .eq('taskId', taskId)
            .eq('date', targetDateStr);
          if (error) throw error;
        } catch (err) {
          console.error('Erro ao remover conclusão no Supabase:', err);
        }
      }

      if (!preventUndoToast) {
        showToast('Tarefa marcada como pendente', 'info', {
          label: 'Desfazer ação',
          onClick: () => handleToggleComplete(taskId, targetDateStr, true),
        });
      } else {
        showToast('Ação desfeita com sucesso', 'success');
      }
    } else {
      // Registra conclusão localmente
      const newCompletion: TaskCompletion = {
        taskId,
        date: targetDateStr,
        completedAt: new Date().toISOString(),
      };
      setCompletions((prev) => [...prev, newCompletion]);
      
      // Atualiza Supabase
      if (isSupabaseConfigured()) {
        try {
          const { error } = await supabase.from('completions').upsert({
            taskId: newCompletion.taskId,
            date: newCompletion.date,
            completedAt: newCompletion.completedAt,
          });
          if (error) throw error;
        } catch (err) {
          console.error('Erro ao salvar conclusão no Supabase:', err);
        }
      }

      if (!preventUndoToast) {
        showToast('Tarefa concluída', 'success', {
          label: 'Desfazer ação',
          onClick: () => handleToggleComplete(taskId, targetDateStr, true),
        });
      } else {
        showToast('Ação desfeita com sucesso', 'success');
      }
    }
  };

  const handleSaveName = () => {
    if (tempName.trim()) {
      setUserName(tempName.trim());
      setIsEditingName(false);
      showToast(`Nome alterado para ${tempName.trim()}`, 'success');
    } else {
      setTempName(userName);
      setIsEditingName(false);
    }
  };

  // --- ATALHOS DE TECLADO GLOBAIS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Verificar se o usuário está digitando em algum campo de texto ou editável
      const target = e.target as HTMLElement;
      const isInputActive =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      // Tecla Escape fecha modais e cancela edições, independente de estar focado em input
      if (e.key === 'Escape') {
        let closedAny = false;
        if (isFormModalOpen) {
          setIsFormModalOpen(false);
          setHistoryEditDate(null);
          closedAny = true;
        }
        if (isDeleteModalOpen) {
          setIsDeleteModalOpen(false);
          closedAny = true;
        }
        if (isShortcutModalOpen) {
          setIsShortcutModalOpen(false);
          closedAny = true;
        }
        if (isEditingName) {
          setIsEditingName(false);
          closedAny = true;
        }
        if (closedAny) {
          e.preventDefault();
        }
        return;
      }

      // Se o usuário estiver digitando em um input, ignoramos os outros atalhos
      if (isInputActive) {
        return;
      }

      const key = e.key.toLowerCase();

      // Tecla 'N': Cria nova tarefa
      if (key === 'n') {
        e.preventDefault();
        handleOpenCreateModal();
        showToast('Atalho: Formulário de nova tarefa aberto', 'info');
      }

      // Tecla 'T': Vai para o dia de hoje
      if (key === 't') {
        e.preventDefault();
        handleGoToToday();
      }

      // Seta Esquerda: Dia anterior (Apenas na visualização da agenda)
      if (e.key === 'ArrowLeft') {
        if (activeView === 'agenda') {
          e.preventDefault();
          changeDateByDays(-1);
        }
      }

      // Seta Direita: Próximo dia (Apenas na visualização da agenda)
      if (e.key === 'ArrowRight') {
        if (activeView === 'agenda') {
          e.preventDefault();
          changeDateByDays(1);
        }
      }

      // Teclas '1', '2', '3': Alterna entre abas
      if (e.key === '1') {
        e.preventDefault();
        setActiveView('agenda');
        showToast('Atalho: Visualizando Meu Cronograma', 'info');
      }
      if (e.key === '2') {
        e.preventDefault();
        setActiveView('stats');
        showToast('Atalho: Visualizando Desempenho & Estatísticas', 'info');
      }
      if (e.key === '3') {
        e.preventDefault();
        setActiveView('history');
        showToast('Atalho: Visualizando Histórico', 'info');
      }

      // Tecla 'P': Alterna notificações
      if (key === 'p') {
        e.preventDefault();
        handleToggleNotifications();
      }

      // Tecla '?': Abre/fecha modal de atalhos
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setIsShortcutModalOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isFormModalOpen,
    isDeleteModalOpen,
    isShortcutModalOpen,
    isEditingName,
    activeView,
    currentDate,
    handleOpenCreateModal,
    handleGoToToday,
    changeDateByDays,
    showToast,
    notificationsEnabled,
    handleToggleNotifications
  ]);

  // --- DERIVADOS DE ESTADO ---
  const currentDateStr = formatDateString(currentDate);
  const isToday = currentDateStr === formatDateString(new Date());
  const activeTasksToday = tasks.filter((t) => isTaskActiveOnDay(t, currentDateStr));

  // Próxima atividade
  const nextTaskInfo = getNextTask(tasks, completions, liveClock);

  // Resumo do Dia
  const totalTasksCount = activeTasksToday.length;
  // Horas ocupadas (extrai horas únicas)
  const uniqueHours = [...new Set(activeTasksToday.map((t) => t.hour.split(':')[0]))];
  const hoursOccupied = uniqueHours.length;
  const freeHours = Math.max(0, 24 - hoursOccupied);

  return (
<div id="app-root-container" className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300 pb-24 lg:pb-12">
      {/* Barra de Horário de Brasília no Topo */}
      <div id="brasilia-time-topbar" className="bg-white border-b border-slate-200/80 dark:bg-slate-900 dark:border-slate-800/80 w-full py-2.5 px-4 sm:px-6 lg:px-8 shadow-2xs">
        <div id="brasilia-time-content" className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div id="brasilia-status-indicator" className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Horário Oficial de Brasília (UTC-3)
              </span>
            </div>
            
            {/* Indicador de Sincronização do Supabase */}
            <div 
              id="supabase-status-badge"
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                isSupabaseConfigured()
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-400'
                  : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-400'
              }`}
              title={isSupabaseConfigured() ? "Conectado ao Supabase: Sincronização em tempo real entre celular e PC ativa!" : "Rodando localmente: insira a URL e Anon Key em src/lib/supabaseClient.ts para ativar a sincronização em tempo real!"}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isSupabaseConfigured() ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
              <span className="uppercase tracking-wider">
                {isSupabaseConfigured() ? 'Supabase Sincronizado' : 'Modo Local'}
              </span>
            </div>
          </div>
          <div id="brasilia-clock-display" className="flex items-center gap-2.5">
            <Clock className="h-4 w-4 text-blue-500 animate-pulse" />
            <span id="brasilia-time-text" className="text-sm font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">
              {new Intl.DateTimeFormat('pt-BR', {
                timeZone: 'America/Sao_Paulo',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
              }).format(liveClock)}
            </span>
            <span id="brasilia-date-text" className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase">
              • {new Intl.DateTimeFormat('pt-BR', {
                timeZone: 'America/Sao_Paulo',
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              }).format(liveClock)}
            </span>
          </div>
        </div>
      </div>

      {/* Container Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 lg:pt-6">
        
        {/* CABEÇALHO MOBILE - Visível apenas em telas pequenas */}
        <div className="lg:hidden flex items-center justify-between mb-4 bg-white border border-slate-100 p-4 rounded-2xl shadow-xs dark:bg-slate-900 dark:border-slate-800">
          <div className="flex flex-col">
            <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              {getGreeting()}
            </span>
            
            {isEditingName ? (
              <div className="flex items-center gap-2 mt-0.5">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') {
                      setTempName(userName);
                      setIsEditingName(false);
                    }
                  }}
                  className="text-base font-extrabold text-slate-900 bg-slate-100 dark:bg-slate-800 dark:text-white px-1.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-hidden max-w-[130px]"
                  autoFocus
                  maxLength={15}
                />
                <button
                  onClick={handleSaveName}
                  className="p-1 rounded-md bg-blue-500 text-white cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 mt-0.5">
                <h1 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                  {userName}
                </h1>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-opacity cursor-pointer"
                  title="Editar Nome"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mr-1">Ativo</span>
            <button
              onClick={handleToggleNotifications}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                notificationsEnabled
                  ? 'bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 dark:text-blue-400 border border-blue-100 dark:border-blue-900/20'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-500 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-400'
              }`}
              title={notificationsEnabled ? "Notificações de Lembrete Ativadas (Avisar 5 min antes)" : "Ativar Notificações de Navegador (Lembrete 5 min antes)"}
            >
              {notificationsEnabled ? <Bell className="h-4 w-4 text-blue-500 animate-pulse" /> : <BellOff className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setIsShortcutModalOpen(true)}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all text-slate-500 dark:text-slate-400 cursor-pointer"
              title="Atalhos de Teclado (?)"
            >
              <Keyboard className="h-4 w-4" />
            </button>
            <button
              onClick={handleToggleTheme}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all text-slate-500 dark:text-slate-400 cursor-pointer"
              title="Alternar Tema"
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Layout de Grid Lateral (Desktop Sidebar / Main Area) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* PAINEL LATERAL / SIDEBAR - Oculto no mobile */}
          <div className="hidden lg:block lg:col-span-1 space-y-5">
            
            {/* Header da Marca e Boas-vindas */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs dark:bg-slate-900 dark:border-slate-800 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                <Sparkles className="h-28 w-28 text-blue-500" />
              </div>
              
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Organizador</span>
                
                <div className="flex items-center gap-1.5">
                  {/* Botão Notificações */}
                  <button
                    onClick={handleToggleNotifications}
                    className={`p-2 rounded-xl transition-all cursor-pointer ${
                      notificationsEnabled
                        ? 'bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 dark:text-blue-400 border border-blue-100 dark:border-blue-900/20'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-500 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-400'
                    }`}
                    title={notificationsEnabled ? "Notificações de Lembrete Ativadas (Avisar 5 min antes)" : "Ativar Notificações de Navegador (Lembrete 5 min antes)"}
                  >
                    {notificationsEnabled ? <Bell className="h-4 w-4 text-blue-500 animate-pulse" /> : <BellOff className="h-4 w-4" />}
                  </button>
                  {/* Botão Atalhos de Teclado */}
                  <button
                    onClick={() => setIsShortcutModalOpen(true)}
                    className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all text-slate-500 dark:text-slate-400 cursor-pointer"
                    title="Atalhos de Teclado (?)"
                  >
                    <Keyboard className="h-4 w-4" />
                  </button>
                  {/* Botão Tema Claro/Escuro */}
                  <button
                    onClick={handleToggleTheme}
                    className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all text-slate-500 dark:text-slate-400 cursor-pointer"
                    title="Alternar Tema"
                  >
                    {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Saudação com Edição de Nome */}
              <div className="relative group">
                <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
                  {getGreeting()}
                </p>
                
                {isEditingName ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveName();
                        if (e.key === 'Escape') {
                          setTempName(userName);
                          setIsEditingName(false);
                        }
                      }}
                      className="text-lg font-extrabold text-slate-900 bg-slate-100 dark:bg-slate-800 dark:text-white px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-hidden w-full"
                      autoFocus
                      maxLength={15}
                    />
                    <button
                      onClick={handleSaveName}
                      className="p-1.5 rounded-lg bg-blue-500 text-white cursor-pointer"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 mt-0.5 group/edit">
                    <h1 className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                      {userName}
                    </h1>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                      title="Editar Nome"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800/60 text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                <span>Agenda Pronta e Ativa</span>
              </div>
            </div>

            {/* Abas / Navegação Lateral */}
            <div className="bg-white rounded-2xl border border-slate-100 p-2.5 shadow-xs dark:bg-slate-900 dark:border-slate-800 flex flex-col space-y-1">
              <button
                onClick={() => setActiveView('agenda')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                  activeView === 'agenda'
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white'
                }`}
              >
                <Calendar className="h-4.5 w-4.5" />
                Meu Cronograma
              </button>

              <button
                onClick={() => setActiveView('stats')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                  activeView === 'stats'
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white'
                }`}
              >
                <BarChart2 className="h-4.5 w-4.5" />
                Desempenho & Estatísticas
              </button>

              <button
                onClick={() => setActiveView('history')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                  activeView === 'history'
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white'
                }`}
              >
                <HistoryIcon className="h-4.5 w-4.5" />
                Histórico
              </button>
            </div>

            {/* DIFERENCIAL PREMIUM: Widget "Próxima Tarefa" */}
            <AnimatePresence mode="popLayout">
              {nextTaskInfo ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`rounded-2xl border p-5 shadow-xs relative overflow-hidden ${
                    nextTaskInfo.isOverdue
                      ? 'bg-rose-50/50 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/40'
                      : 'bg-indigo-50/50 border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Diferencial Premium
                    </span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 ${
                      nextTaskInfo.isOverdue
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                        : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400'
                    }`}>
                      Próxima Atividade
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mt-3 truncate">
                    {nextTaskInfo.task.name}
                  </h3>

                  <div className="flex items-center gap-2 mt-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{nextTaskInfo.task.hour}</span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className={nextTaskInfo.isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-600 dark:text-indigo-400'}>
                      {nextTaskInfo.remainingText}
                    </span>
                  </div>

                  {/* Clique rápido para completar */}
                  <button
                    onClick={() => handleToggleComplete(nextTaskInfo.task.id)}
                    className="w-full mt-4 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold py-2 rounded-xl border border-slate-200/60 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    Concluir Atividade
                  </button>
                </motion.div>
              ) : (
                <div className="bg-slate-100/50 border border-slate-150 rounded-2xl p-5 text-center dark:bg-slate-900/30 dark:border-slate-800">
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">
                    Sem tarefas pendentes {isToday ? 'hoje' : `para ${getDayOfWeekName(currentDate).toLowerCase()}`}!
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    {isToday ? 'Bom trabalho! Você está em dia com todas as atividades.' : 'Nenhuma atividade planejada ou pendente para este dia.'}
                  </p>
                </div>
              )}
            </AnimatePresence>

            {/* DIFERENCIAL PREMIUM: Widget "Resumo do Dia" */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs dark:bg-slate-900 dark:border-slate-800">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-3">
                Resumo de {getDayOfWeekName(currentDate)}
              </span>

              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-100/50 dark:border-slate-800/60">
                  <p className="text-lg font-extrabold text-slate-800 dark:text-white font-mono leading-none">
                    {totalTasksCount}
                  </p>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium mt-1">Tarefas</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-100/50 dark:border-slate-800/60">
                  <p className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400 font-mono leading-none">
                    {hoursOccupied}h
                  </p>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium mt-1">Ocupadas</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-100/50 dark:border-slate-800/60">
                  <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 font-mono leading-none">
                    {freeHours}h
                  </p>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium mt-1">Livres</p>
                </div>
              </div>
            </div>

          </div>

          {/* ÁREA DE CONTEÚDO PRINCIPAL (3 colunas em desktop) */}
          <div className="lg:col-span-3 space-y-5">
            
            {/* BARRA SUPERIOR DE DATA E CONTROLE (Apenas visível se em visualização de agenda) */}
            {activeView === 'agenda' && (
              <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 shadow-xs dark:bg-slate-900 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* Navegador de Data */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    onClick={() => changeDateByDays(-1)}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
                    title="Dia Anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <button
                    onClick={handleGoToToday}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer animate-fade-in"
                    title={isToday ? "Você já está em Hoje" : "Voltar para Hoje"}
                  >
                    {isToday ? 'Hoje' : getDayOfWeekName(currentDate)}
                  </button>

                  <button
                    onClick={() => changeDateByDays(1)}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
                    title="Próximo Dia"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  
                  {/* Visualização Extensa da Data */}
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white ml-2">
                    {formatFullDate(currentDate)}
                  </span>
                </div>

                {/* Seletor de Data Direto (Calendário Embutido) e Botão Criar */}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="date"
                      value={currentDateStr}
                      onChange={handleDatePickerChange}
                      className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs text-slate-800 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-100 cursor-pointer"
                    />
                  </div>

                  <button
                    onClick={handleOpenCreateModal}
                    className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-500/10 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Plus className="h-4 w-4" />
                    Nova Tarefa
                  </button>
                </div>

              </div>
            )}

            {/* SEÇÃO DE FILTROS E PESQUISA (Apenas na agenda) */}
            {activeView === 'agenda' && (
              <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 shadow-xs dark:bg-slate-900 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* Campo de Pesquisa */}
                <div className="relative flex-1 max-w-md w-full">
                  <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Pesquisar tarefas por nome ou descrição..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                {/* Filtros Rápidos */}
                <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 select-none">
                  {(['all', 'pending', 'completed', 'daily', 'weekly'] as TaskFilter[]).map((f) => {
                    const labels = {
                      all: 'Todas',
                      pending: 'Pendentes',
                      completed: 'Concluídas',
                      daily: 'Diárias',
                      weekly: 'Semanais',
                    };
                    return (
                      <button
                        key={f}
                        onClick={() => setActiveFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                          activeFilter === f
                            ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-950'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/60 dark:hover:text-white'
                        }`}
                      >
                        {labels[f]}
                      </button>
                    );
                  })}
                </div>

              </div>
            )}

            {/* ABAS DINÂMICAS: MUDANÇA DE CONTEÚDO PRINCIPAL */}
            <div className="transition-all duration-300">
              <AnimatePresence mode="wait">
                {activeView === 'agenda' && (
                  <motion.div
                    key="agenda"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* WIDGET MOBILE - PRÓXIMA ATIVIDADE */}
                    <div className="block lg:hidden">
                      <AnimatePresence mode="popLayout">
                        {nextTaskInfo && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={`rounded-2xl border p-4 shadow-xs relative overflow-hidden mb-4 ${
                              nextTaskInfo.isOverdue
                                ? 'bg-rose-50/50 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/40'
                                : 'bg-indigo-50/50 border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/40'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-405 dark:text-slate-500">
                                Diferencial Premium
                              </span>
                              <span className={`inline-flex items-center gap-1 text-[9px] font-bold rounded-full px-2 py-0.5 ${
                                nextTaskInfo.isOverdue
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                                  : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400'
                              }`}>
                                Próxima Atividade
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-4 mt-2">
                              <div className="min-w-0">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                                  {nextTaskInfo.task.name}
                                </h3>
                                <div className="flex items-center gap-1.5 mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                  <Clock className="h-3 w-3" />
                                  <span>{nextTaskInfo.task.hour}</span>
                                  <span className="text-slate-300 dark:text-slate-700">•</span>
                                  <span className={nextTaskInfo.isOverdue ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-indigo-600 dark:text-indigo-400 font-extrabold'}>
                                    {nextTaskInfo.remainingText}
                                  </span>
                                </div>
                              </div>

                              <button
                                onClick={() => handleToggleComplete(nextTaskInfo.task.id)}
                                className="shrink-0 bg-white hover:bg-slate-50 text-slate-800 text-[11px] font-extrabold px-3 py-2 rounded-xl border border-slate-200/60 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-all shadow-xs cursor-pointer flex items-center gap-1"
                              >
                                <Check className="h-3 w-3 text-emerald-500" />
                                Concluir
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <DailyCalendar
                      activeTasks={activeTasksToday}
                      completions={completions}
                      currentDateStr={currentDateStr}
                      onToggleComplete={handleToggleComplete}
                      onEditTask={handleOpenEditModal}
                      onDeleteTask={handleOpenDeleteConfirm}
                      onQuickCreate={handleOpenQuickCreateModal}
                      searchQuery={searchQuery}
                      activeFilter={activeFilter}
                      liveClock={liveClock}
                    />
                  </motion.div>
                )}

                {activeView === 'stats' && (
                  <motion.div
                    key="stats"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* WIDGET MOBILE - RESUMO DO DIA */}
                    <div className="block lg:hidden mb-4">
                      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs dark:bg-slate-900 dark:border-slate-800">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2.5">
                          Resumo do Dia
                        </span>

                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-slate-50 dark:bg-slate-800/40 p-1.5 rounded-xl border border-slate-100/50 dark:border-slate-800/60">
                            <p className="text-base font-extrabold text-slate-800 dark:text-white font-mono leading-none">
                              {totalTasksCount}
                            </p>
                            <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold mt-1 uppercase tracking-wider">Tarefas</p>
                          </div>

                          <div className="bg-slate-50 dark:bg-slate-800/40 p-1.5 rounded-xl border border-slate-100/50 dark:border-slate-800/60">
                            <p className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 font-mono leading-none">
                              {hoursOccupied}h
                            </p>
                            <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold mt-1 uppercase tracking-wider">Ocupadas</p>
                          </div>

                          <div className="bg-slate-50 dark:bg-slate-800/40 p-1.5 rounded-xl border border-slate-100/50 dark:border-slate-800/60">
                            <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono leading-none">
                              {freeHours}h
                            </p>
                            <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold mt-1 uppercase tracking-wider">Livres</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <StatsDashboard
                      tasks={tasks}
                      completions={completions}
                      currentDate={currentDate}
                    />
                  </motion.div>
                )}

                {activeView === 'history' && (
                  <motion.div
                    key="history"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.2 }}
                  >
                    <HistoryTab
                      tasks={tasks}
                      completions={completions}
                      currentDate={currentDate}
                      onToggleComplete={handleToggleComplete}
                      onEditTask={handleOpenHistoryEditModal}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>

        </div>

      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-45 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-150 dark:border-slate-800/80 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_-4px_12px_rgba(0,0,0,0.2)]">
        <div className="flex items-center justify-around h-16 max-w-md mx-auto px-6">
          <button
            onClick={() => setActiveView('agenda')}
            className={`flex flex-col items-center justify-center w-20 h-full transition-all cursor-pointer ${
              activeView === 'agenda'
                ? 'text-blue-600 dark:text-blue-400 font-extrabold'
                : 'text-slate-450 dark:text-slate-500 font-semibold'
            }`}
          >
            <Calendar className={`h-5 w-5 mb-1 transition-transform ${activeView === 'agenda' ? 'scale-110' : ''}`} />
            <span className="text-[10px] tracking-tight">Cronograma</span>
          </button>

          <button
            onClick={() => setActiveView('stats')}
            className={`flex flex-col items-center justify-center w-20 h-full transition-all cursor-pointer ${
              activeView === 'stats'
                ? 'text-blue-600 dark:text-blue-400 font-extrabold'
                : 'text-slate-450 dark:text-slate-500 font-semibold'
            }`}
          >
            <BarChart2 className={`h-5 w-5 mb-1 transition-transform ${activeView === 'stats' ? 'scale-110' : ''}`} />
            <span className="text-[10px] tracking-tight">Desempenho</span>
          </button>

          <button
            onClick={() => setActiveView('history')}
            className={`flex flex-col items-center justify-center w-20 h-full transition-all cursor-pointer ${
              activeView === 'history'
                ? 'text-blue-600 dark:text-blue-400 font-extrabold'
                : 'text-slate-450 dark:text-slate-500 font-semibold'
            }`}
          >
            <HistoryIcon className={`h-5 w-5 mb-1 transition-transform ${activeView === 'history' ? 'scale-110' : ''}`} />
            <span className="text-[10px] tracking-tight">Histórico</span>
          </button>
        </div>
      </div>

      {/* --- COMPONENTES GLOBAIS DE MODAL E FEEDBACK --- */}

      {/* Modal de Criação / Edição de Tarefas */}
      <TaskFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setHistoryEditDate(null);
        }}
        onSubmit={handleSaveTask}
        taskToEdit={taskToEdit}
        prefilledHour={prefilledHour}
        defaultDate={currentDateStr}
        historyEditDate={historyEditDate}
        isCompletedOnHistoryEditDate={
          historyEditDate && taskToEdit
            ? completions.some((c) => c.taskId === taskToEdit.id && c.date === historyEditDate)
            : false
        }
        historyCompletionTime={
          historyEditDate && taskToEdit
            ? completions.find((c) => c.taskId === taskToEdit.id && c.date === historyEditDate)?.completedTime
            : undefined
        }
        historyDelayReason={
          historyEditDate && taskToEdit
            ? completions.find((c) => c.taskId === taskToEdit.id && c.date === historyEditDate)?.delayReason
            : undefined
        }
      />

      {/* Modal de Confirmação de Exclusão (Evita usar confirm nativo que trava iframes) */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteTask}
        title="Excluir Tarefa?"
        message={`Você tem certeza que deseja excluir "${taskToDelete?.name}"? Esta ação removerá a tarefa de todos os cronogramas e não poderá ser desfeita.`}
        confirmText="Sim, Excluir"
        cancelText="Não, Cancelar"
      />

      {/* Modal de Guia de Atalhos de Teclado */}
      <ShortcutsModal
        isOpen={isShortcutModalOpen}
        onClose={() => setIsShortcutModalOpen(false)}
      />

      {/* Contêiner de Toasts / Notificações Animadas */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
