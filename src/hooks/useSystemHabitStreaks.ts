import { useMemo } from "react";
import { useAllDailyCheckIns } from "@/hooks/useAllDailyCheckIns";
import { useAllWeeklyPlanningSessions } from "@/hooks/useAllWeeklyPlanningSessions";
import { format, parseISO, startOfWeek, differenceInDays, differenceInWeeks } from "date-fns";

interface SystemHabitStreak {
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null;
  isDueToday: boolean;
  unit: 'day' | 'week';
}

export interface SystemHabitStreaks {
  dailyCheckIn: SystemHabitStreak;
  weeklyPlanning: SystemHabitStreak;
  isLoading: boolean;
}

export const useSystemHabitStreaks = (): SystemHabitStreaks => {
  const { checkIns, isLoading: checkInsLoading } = useAllDailyCheckIns(365); // Get a year's worth
  const { sessions, isLoading: sessionsLoading } = useAllWeeklyPlanningSessions();

  const isLoading = checkInsLoading || sessionsLoading;

  const dailyCheckInStreak = useMemo((): SystemHabitStreak => {
    if (!checkIns || checkIns.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastCompletedDate: null,
        isDueToday: true,
        unit: 'day'
      };
    }

    // Sort check-ins by date descending
    const sortedDates = [...new Set(checkIns.map(c => c.check_in_date))]
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
    
    const lastCompletedDate = sortedDates[0] || null;
    const checkedInToday = sortedDates[0] === today;
    const isDueToday = !checkedInToday;

    // Calculate current streak
    let currentStreak = 0;
    let expectedDate = checkedInToday ? today : yesterday;
    
    for (const date of sortedDates) {
      if (date === expectedDate) {
        currentStreak++;
        // Move to previous day
        expectedDate = format(new Date(new Date(expectedDate).getTime() - 86400000), 'yyyy-MM-dd');
      } else if (currentStreak === 0 && date === yesterday) {
        // If didn't check in today but did yesterday, start counting
        currentStreak = 1;
        expectedDate = format(new Date(new Date(date).getTime() - 86400000), 'yyyy-MM-dd');
      } else {
        break;
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    let prevDate: string | null = null;

    for (const date of sortedDates) {
      if (prevDate === null) {
        tempStreak = 1;
      } else {
        const dayDiff = differenceInDays(parseISO(prevDate), parseISO(date));
        if (dayDiff === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);
      prevDate = date;
    }

    return {
      currentStreak,
      longestStreak,
      lastCompletedDate,
      isDueToday,
      unit: 'day'
    };
  }, [checkIns]);

  const weeklyPlanningStreak = useMemo((): SystemHabitStreak => {
    if (!sessions || sessions.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastCompletedDate: null,
        isDueToday: true,
        unit: 'week'
      };
    }

    // Filter completed sessions and sort by week_start descending
    const completedSessions = sessions
      .filter(s => s.is_completed)
      .sort((a, b) => new Date(b.week_start).getTime() - new Date(a.week_start).getTime());

    if (completedSessions.length === 0) {
      const currentWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const hasCurrentWeekSession = sessions.some(s => s.week_start === currentWeekStart);
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastCompletedDate: null,
        isDueToday: !hasCurrentWeekSession,
        unit: 'week'
      };
    }

    const sortedWeeks = completedSessions.map(s => s.week_start);
    const currentWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const lastWeekStart = format(startOfWeek(new Date(Date.now() - 7 * 86400000), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    
    const lastCompletedDate = sortedWeeks[0] || null;
    const completedThisWeek = sortedWeeks[0] === currentWeekStart;
    const isDueToday = !completedThisWeek;

    // Calculate current streak
    let currentStreak = 0;
    let expectedWeek = completedThisWeek ? currentWeekStart : lastWeekStart;
    
    for (const weekStart of sortedWeeks) {
      if (weekStart === expectedWeek) {
        currentStreak++;
        // Move to previous week
        const prevWeek = new Date(expectedWeek);
        prevWeek.setDate(prevWeek.getDate() - 7);
        expectedWeek = format(startOfWeek(prevWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      } else if (currentStreak === 0 && weekStart === lastWeekStart) {
        // If didn't complete this week but did last week, start counting
        currentStreak = 1;
        const prevWeek = new Date(weekStart);
        prevWeek.setDate(prevWeek.getDate() - 7);
        expectedWeek = format(startOfWeek(prevWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      } else {
        break;
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    let prevWeek: string | null = null;

    for (const weekStart of sortedWeeks) {
      if (prevWeek === null) {
        tempStreak = 1;
      } else {
        const weekDiff = differenceInWeeks(parseISO(prevWeek), parseISO(weekStart));
        if (weekDiff === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);
      prevWeek = weekStart;
    }

    return {
      currentStreak,
      longestStreak,
      lastCompletedDate,
      isDueToday,
      unit: 'week'
    };
  }, [sessions]);

  return {
    dailyCheckIn: dailyCheckInStreak,
    weeklyPlanning: weeklyPlanningStreak,
    isLoading
  };
};
