import { Goal } from "@/types/goals";

export interface QuarterDateRange {
  start: Date;
  end: Date;
}

export function getQuarterDateRange(year: number, quarter: number): QuarterDateRange {
  const startMonth = (quarter - 1) * 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0, 23, 59, 59, 999);
  return { start, end };
}

export function isDateInQuarter(date: Date | string | null, year: number, quarter: number): boolean {
  if (!date) return false;
  const d = typeof date === 'string' ? new Date(date) : date;
  const { start, end } = getQuarterDateRange(year, quarter);
  return d >= start && d <= end;
}

export interface QuarterGoals {
  completed: Goal[];
  inProgress: Goal[];
  notStarted: Goal[];
  deprioritized: Goal[];
}

export function filterGoalsByQuarter(goals: Goal[], year: number, quarter: number): QuarterGoals {
  const { start, end } = getQuarterDateRange(year, quarter);
  
  const completed: Goal[] = [];
  const inProgress: Goal[] = [];
  const notStarted: Goal[] = [];
  const deprioritized: Goal[] = [];
  
  goals.forEach(goal => {
    // Skip deleted goals
    if (goal.status === 'deleted') return;
    
    // Check if goal is relevant to this quarter
    const completedAt = goal.completed_at ? new Date(goal.completed_at) : null;
    const deprioritizedAt = goal.deprioritized_at ? new Date(goal.deprioritized_at) : null;
    const createdAt = new Date(goal.created_at);
    const targetDate = goal.target_date ? new Date(goal.target_date) : null;
    
    // Goal completed this quarter
    if (goal.status === 'completed' && completedAt && completedAt >= start && completedAt <= end) {
      completed.push(goal);
      return;
    }
    
    // Goal deprioritized this quarter
    if (goal.status === 'deprioritized' && deprioritizedAt && deprioritizedAt >= start && deprioritizedAt <= end) {
      deprioritized.push(goal);
      return;
    }
    
    // Active goals (in_progress or not_started) that are relevant to this quarter
    if (goal.status === 'in_progress' || goal.status === 'not_started') {
      const isRelevant = 
        // Created this quarter
        (createdAt >= start && createdAt <= end) ||
        // Target date falls in this quarter
        (targetDate && targetDate >= start && targetDate <= end) ||
        // Created before this quarter and still active (ongoing work)
        (createdAt < start);
      
      if (isRelevant) {
        if (goal.status === 'in_progress') {
          inProgress.push(goal);
        } else {
          notStarted.push(goal);
        }
      }
    }
  });
  
  return { completed, inProgress, notStarted, deprioritized };
}

export function getQuarterName(quarter: number): string {
  const names = ['Q1 (Jan-Mar)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dec)'];
  return names[quarter - 1] || '';
}
