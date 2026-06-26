import { Task, TaskCompletion } from '../types';
import { formatDateString } from '../utils/dateUtils';

export function getInitialTasks(): Task[] {
  const todayStr = formatDateString(new Date());
  
  return [
    {
      id: 'mock-1',
      name: 'Academia',
      hour: '08:00',
      type: 'weekly',
      daysOfWeek: [1, 2, 3, 4, 5], // Seg, Ter, Qua, Qui, Sex
      description: 'Treino focado em musculação e cardio de 30 min.',
      color: '#10b981', // Emerald
      createdAt: new Date().toISOString()
    },
    {
      id: 'mock-2',
      name: 'Reunião de Equipe',
      hour: '10:00',
      type: 'daily',
      date: todayStr,
      description: 'Daily Scrum - Alinhamento das sprints e impedimentos.',
      color: '#3b82f6', // Blue
      createdAt: new Date().toISOString()
    },
    {
      id: 'mock-3',
      name: 'Almoço Nutritivo',
      hour: '12:30',
      type: 'daily',
      date: todayStr,
      description: 'Refeição balanceada focada em proteínas e vegetais.',
      color: '#f59e0b', // Amber
      createdAt: new Date().toISOString()
    },
    {
      id: 'mock-4',
      name: 'Estudar Programação',
      hour: '15:00',
      type: 'weekly',
      daysOfWeek: [1, 3, 4, 6], // Seg, Qua, Qui, Sáb (hoje é Quinta-feira 25/06)
      description: 'Praticar conceitos de React, TypeScript e hooks do Tailwind.',
      color: '#8b5cf6', // Violet
      createdAt: new Date().toISOString()
    },
    {
      id: 'mock-5',
      name: 'Leitura Noturna',
      hour: '21:30',
      type: 'weekly',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // Todos os dias
      description: 'Ler pelo menos 15 páginas de um livro técnico ou de ficção.',
      color: '#f43f5e', // Rose
      createdAt: new Date().toISOString()
    }
  ];
}

export function getInitialCompletions(): TaskCompletion[] {
  const todayStr = formatDateString(new Date());
  return [
    {
      taskId: 'mock-1',
      date: todayStr,
      completedAt: new Date(new Date().setHours(8, 45, 0, 0)).toISOString()
    }
  ];
}
