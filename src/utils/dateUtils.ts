import { Task, TaskCompletion } from '../types';

/**
 * Retorna a data no formato YYYY-MM-DD
 */
export function formatDateString(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Retorna o nome do dia da semana em português
 */
export function getDayOfWeekName(date: Date): string {
  const days = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado'
  ];
  return days[date.getDay()];
}

/**
 * Retorna uma saudação apropriada baseada no horário
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return 'Bom dia';
  } else if (hour >= 12 && hour < 18) {
    return 'Boa tarde';
  } else {
    return 'Boa noite';
  }
}

/**
 * Retorna a data formatada por extenso em português (ex: "Quinta-feira, 25 de Junho")
 */
export function formatFullDate(date: Date): string {
  const dayName = getDayOfWeekName(date);
  const dayNum = date.getDate();
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const monthName = months[date.getMonth()];
  const year = date.getFullYear();
  return `${dayName}, ${dayNum} de ${monthName} de ${year}`;
}

/**
 * Verifica se a tarefa está ativa no dia especificado
 */
export function isTaskActiveOnDay(task: Task, dateStr: string): boolean {
  // Verifica se a data está dentro do período opcional de validade da tarefa
  if (task.startDate && dateStr < task.startDate) {
    return false;
  }
  if (task.endDate && dateStr > task.endDate) {
    return false;
  }

  const dateObj = new Date(dateStr + 'T00:00:00');
  
  if (task.type === 'daily') {
    return task.date === dateStr;
  } else if (task.type === 'weekly') {
    const dayOfWeek = dateObj.getDay(); // 0 = Domingo, 1 = Segunda, etc.
    return task.daysOfWeek ? task.daysOfWeek.includes(dayOfWeek) : false;
  }
  return false;
}

/**
 * Retorna os limites de uma semana dada uma data (de domingo a sábado)
 */
export function getWeekRange(date: Date): { start: Date; end: Date } {
  const currentDay = date.getDay();
  const start = new Date(date);
  start.setDate(date.getDate() - currentDay);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Retorna os limites de um mês dada uma data
 */
export function getMonthRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

/**
 * Calcula a próxima tarefa pendente para o dia atual, informando o tempo restante ou atraso.
 */
export function getNextTask(
  tasks: Task[],
  completions: TaskCompletion[],
  currentDate: Date
): { task: Task; remainingText: string; isOverdue: boolean } | null {
  const todayStr = formatDateString(currentDate);
  const currentHour = currentDate.getHours();
  const currentMinute = currentDate.getMinutes();
  
  // Filtra tarefas ativas hoje que NÃO estão concluídas hoje
  const activeTasks = tasks.filter(t => isTaskActiveOnDay(t, todayStr));
  const pendingTasks = activeTasks.filter(
    t => !completions.some(c => c.taskId === t.id && c.date === todayStr)
  );

  if (pendingTasks.length === 0) return null;

  // Mapeia tarefas para minutos totais desde o início do dia para ordenação
  const parsedTasks = pendingTasks.map(task => {
    const [h, m] = task.hour.split(':').map(Number);
    const taskMinutes = h * 60 + m;
    const currentMinutes = currentHour * 60 + currentMinute;
    const diff = taskMinutes - currentMinutes;
    return { task, diff, taskMinutes };
  });

  // Separa tarefas futuras de tarefas atrasadas do dia
  const futureTasks = parsedTasks.filter(item => item.diff > 0).sort((a, b) => a.diff - b.diff);
  const overdueTasks = parsedTasks.filter(item => item.diff <= 0 && item.diff >= -10).sort((a, b) => b.diff - a.diff); // Atrasadas mais próximas de agora primeiro (limite de 10 minutos)

  if (futureTasks.length > 0) {
    const nextItem = futureTasks[0];
    const diffMinutes = nextItem.diff;
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    
    let remainingText = '';
    if (hours > 0) {
      remainingText = `${hours}h ${mins > 0 ? `${mins}min` : ''}`;
    } else {
      remainingText = `${mins}min`;
    }
    
    return {
      task: nextItem.task,
      remainingText: `Começa em: ${remainingText}`,
      isOverdue: false,
    };
  } else if (overdueTasks.length > 0) {
    const nextItem = overdueTasks[0];
    const diffMinutes = Math.abs(nextItem.diff);
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    
    let overdueText = '';
    if (hours > 0) {
      overdueText = `${hours}h ${mins > 0 ? `${mins}min` : ''}`;
    } else {
      overdueText = `${mins}min`;
    }

    return {
      task: nextItem.task,
      remainingText: `Atrasada há: ${overdueText}`,
      isOverdue: true,
    };
  }

  return null;
}

/**
 * Verifica se a tarefa está em atraso (ou seja, seu horário já passou com tolerância de 10 minutos para a data informada).
 */
export function isTaskOverdue(task: Task, dateStr: string, currentDateTime: Date): boolean {
  const todayStr = formatDateString(currentDateTime);
  if (dateStr < todayStr) {
    return true; // É um dia passado completo, tudo já é atraso se não feito
  }
  if (dateStr > todayStr) {
    return false; // É um dia no futuro
  }
  
  // É hoje: compara as horas com a tolerância de 10 minutos
  const [taskH, taskM] = task.hour.split(':').map(Number);
  const currentH = currentDateTime.getHours();
  const currentM = currentDateTime.getMinutes();
  
  const taskMinutes = taskH * 60 + taskM;
  const currentMinutes = currentH * 60 + currentM;
  
  return currentMinutes > (taskMinutes + 10);
}

