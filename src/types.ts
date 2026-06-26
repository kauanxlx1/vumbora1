export interface Task {
  id: string;
  name: string;
  hour: string; // "HH:MM" (start hour)
  endHour?: string; // "HH:MM" (optional end hour)
  type: 'daily' | 'weekly';
  date?: string; // "YYYY-MM-DD" (only used for daily tasks)
  daysOfWeek?: number[]; // [0, 1, 2, 3, 4, 5, 6] representing Sun, Mon, Tue, Wed, Thu, Fri, Sat
  description?: string;
  color?: string; // hex or Tailwind indicator
  createdAt: string;
  startDate?: string; // "YYYY-MM-DD" (optional)
  endDate?: string; // "YYYY-MM-DD" (optional)
}

export interface TaskCompletion {
  taskId: string;
  date: string; // "YYYY-MM-DD"
  completedAt: string; // ISO string timestamp
  completedTime?: string; // "HH:MM" (optional) actual time completed
  delayReason?: string; // (optional) why it was delayed
}

export interface DaySummary {
  totalTasks: number;
  occupiedHours: number;
  freeHours: number;
}

export type TaskFilter = 'all' | 'pending' | 'completed' | 'daily' | 'weekly';

export type HistoryPeriod = 'today' | 'week' | 'month';
