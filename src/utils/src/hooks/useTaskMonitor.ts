import { useEffect, useState, useRef } from 'react';
import { Task, TaskCompletion } from '../types';
import { playAlertSound } from '../utils/audioAlert';
import { isTaskActiveOnDay } from '../utils/dateUtils';

interface UseTaskMonitorProps {
  tasks: Task[];
  completions: TaskCompletion[];
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export function useTaskMonitor({ tasks, completions, showToast }: UseTaskMonitorProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const checkedMinutesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async (): Promise<NotificationPermission> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      showToast('Este navegador não suporta notificações.', 'warning');
      return 'denied';
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  };

  const getBrasiliaDateString = (date: Date): string => {
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric', month: '2-digit', day: '2-digit'
    });
    const parts = formatter.formatToParts(date);
    const day = parts.find((p) => p.type === 'day')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const year = parts.find((p) => p.type === 'year')?.value;
    return `${year}-${month}-${day}`;
  };

  const getBrasiliaTime = (date: Date) => {
    const timeStr = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).format(date);
    const [h, m] = timeStr.split(':').map(Number);
    return { hours: h, minutes: m };
  };

  useEffect(() => {
    const monitorInterval = setInterval(() => {
      const now = new Date();
      const brasiliaDateStr = getBrasiliaDateString(now);
      const { hours, minutes } = getBrasiliaTime(now);
      const currentMinutesTotal = hours * 60 + minutes;

      const activeTasksToday = tasks.filter((t) => isTaskActiveOnDay(t, brasiliaDateStr));

      activeTasksToday.forEach((task) => {
        const [taskH, taskM] = task.hour.split(':').map(Number);
        const taskMinutesTotal = taskH * 60 + taskM;

        const isCompleted = completions.some(
          (c) => c.taskId === task.id && c.date === brasiliaDateStr
        );

        const startKey = `start_${task.id}_${brasiliaDateStr}_${task.hour}`;
        const lateKey = `late_${task.id}_${brasiliaDateStr}_${task.hour}`;

        // 1. Hora da Tarefa: Início exato
        if (currentMinutesTotal === taskMinutesTotal && !isCompleted) {
          if (!checkedMinutesRef.current.has(startKey)) {
            checkedMinutesRef.current.add(startKey);
            playAlertSound();

            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Vumbora! Hora da Tarefa', {
                body: `Está na hora de fazer: "${task.name}" (${task.hour})!`,
                icon: '/favicon.ico',
                tag: `task-start-${task.id}`,
                requireInteraction: true
              });
            }
            showToast(`Está na hora de realizar a tarefa: "${task.name}"!`, 'info');
          }
        }

        // 2. Regra dos 10 Minutos de tolerância esgotada
        if (currentMinutesTotal === taskMinutesTotal + 10 && !isCompleted) {
          if (!checkedMinutesRef.current.has(lateKey)) {
            checkedMinutesRef.current.add(lateKey);
            playAlertSound();

            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Tolerância Expirada!', {
                body: `A tolerância de 10m para "${task.name}" acabou. Ela agora está marcada no histórico como não concluída.`,
                icon: '/favicon.ico',
                tag: `task-late-${task.id}`,
                requireInteraction: true
              });
            }
            showToast(`Tolerância de 10m esgotada para "${task.name}". Status: Não Concluída.`, 'warning');
          }
        }
      });
    }, 10000); // Roda a cada 10 segundos de forma extremamente leve

    return () => clearInterval(monitorInterval);
  }, [tasks, completions, showToast]);

  return { permission, requestNotificationPermission };
}
