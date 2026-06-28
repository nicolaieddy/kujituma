import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, ArrowUpDown, ArrowUp, ArrowDown, Circle, Columns3, Check, X } from "lucide-react";
import { formatTimeAgo } from "@/utils/timeUtils";
import UserDetailDrawer from "./UserDetailDrawer";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
  posts_count: number;
  role?: string;
  last_active_at?: string;
  total_time_seconds?: number;
  days_active?: number;
  total_clicks?: number;
  total_scrolls?: number;
  total_keypresses?: number;
  tos_accepted_at?: string;
  tos_version?: string;
  goals_active?: number;
  goals_completed?: number;
  habits_count?: number;
  check_ins_total?: number;
  country?: string;
  city?: string;
  phone_verified?: boolean;
}

interface UsersOverviewProps {
  users: AdminUser[];
  onUserDeleted?: (userId: string) => void;
}

type SortKey =
  | 'full_name' | 'email' | 'role' | 'posts_count'
  | 'last_active_at' | 'created_at' | 'total_time_seconds'
  | 'days_active' | 'engagement' | 'tos_accepted_at'
  | 'goals_active' | 'goals_completed' | 'habits_count'
  | 'check_ins_total' | 'country' | 'city' | 'phone_verified';
type SortDirection = 'asc' | 'desc';

type OptionalColumnKey =
  | 'role' | 'posts_count' | 'total_time_seconds' | 'engagement'
  | 'tos_accepted_at' | 'days_active' | 'check_ins_total'
  | 'goals' | 'habits_count' | 'country_city' | 'phone_verified';

const COLUMN_LABELS: Record<OptionalColumnKey, string> = {
  role: 'Role',
  posts_count: 'Posts',
  total_time_seconds: 'Time',
  engagement: 'Engagement',
  tos_accepted_at: 'ToS Accepted',
  days_active: 'Days active',
  check_ins_total: 'Check-ins',
  goals: 'Goals (active / done)',
  habits_count: 'Habits',
  country_city: 'Location',
  phone_verified: 'Phone verified',
};

const DEFAULT_VISIBLE: OptionalColumnKey[] = [
  'role', 'posts_count', 'total_time_seconds', 'engagement', 'tos_accepted_at',
];

const STORAGE_KEY = 'admin.usersOverview.visibleColumns.v1';

const formatDuration = (seconds: number): string => {
  if (seconds === 0) return '0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const formatNumber = (num: number): string => {
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toString();
};

const UsersOverview = ({ users, onUserDeleted }: UsersOverviewProps) => {
  const [sortKey, setSortKey] = useState<SortKey>('last_active_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [visibleCols, setVisibleCols] = useState<Set<OptionalColumnKey>>(() => {
    if (typeof window === 'undefined') return new Set(DEFAULT_VISIBLE);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as OptionalColumnKey[];
        return new Set(parsed);
      }
    } catch {/* ignore */}
    return new Set(DEFAULT_VISIBLE);
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(visibleCols)));
    } catch {/* ignore */}
  }, [visibleCols]);

  const toggleCol = (key: OptionalColumnKey) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isVisible = (key: OptionalColumnKey) => visibleCols.has(key);

  const { onlineUsers } = useOnlinePresence();
  const onlineUserIds = new Set(onlineUsers.map((u) => u.id));

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const handleUserClick = (user: AdminUser) => {
    setSelectedUser(user);
    setDrawerOpen(true);
  };

  const getEngagementScore = (user: AdminUser) =>
    (user.total_clicks || 0) + (user.total_scrolls || 0) + (user.total_keypresses || 0);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      let aVal: string | number | boolean | null = null;
      let bVal: string | number | boolean | null = null;

      switch (sortKey) {
        case 'full_name': aVal = a.full_name.toLowerCase(); bVal = b.full_name.toLowerCase(); break;
        case 'email': aVal = a.email.toLowerCase(); bVal = b.email.toLowerCase(); break;
        case 'role': aVal = a.role || ''; bVal = b.role || ''; break;
        case 'posts_count': aVal = a.posts_count; bVal = b.posts_count; break;
        case 'last_active_at':
          aVal = a.last_active_at ? new Date(a.last_active_at).getTime() : 0;
          bVal = b.last_active_at ? new Date(b.last_active_at).getTime() : 0; break;
        case 'created_at':
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime(); break;
        case 'total_time_seconds': aVal = a.total_time_seconds || 0; bVal = b.total_time_seconds || 0; break;
        case 'days_active': aVal = a.days_active || 0; bVal = b.days_active || 0; break;
        case 'engagement': aVal = getEngagementScore(a); bVal = getEngagementScore(b); break;
        case 'tos_accepted_at':
          aVal = a.tos_accepted_at ? new Date(a.tos_accepted_at).getTime() : 0;
          bVal = b.tos_accepted_at ? new Date(b.tos_accepted_at).getTime() : 0; break;
        case 'goals_active': aVal = a.goals_active || 0; bVal = b.goals_active || 0; break;
        case 'goals_completed': aVal = a.goals_completed || 0; bVal = b.goals_completed || 0; break;
        case 'habits_count': aVal = a.habits_count || 0; bVal = b.habits_count || 0; break;
        case 'check_ins_total': aVal = a.check_ins_total || 0; bVal = b.check_ins_total || 0; break;
        case 'country': aVal = (a.country || '').toLowerCase(); bVal = (b.country || '').toLowerCase(); break;
        case 'city': aVal = (a.city || '').toLowerCase(); bVal = (b.city || '').toLowerCase(); break;
        case 'phone_verified': aVal = a.phone_verified ? 1 : 0; bVal = b.phone_verified ? 1 : 0; break;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [users, sortKey, sortDirection]);

  const SortableHeader = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => {
    const isActive = sortKey === sortKeyName;
    return (
      <TableHead
        className="text-foreground cursor-pointer hover:bg-accent/50 transition-colors select-none whitespace-nowrap"
        onClick={() => handleSort(sortKeyName)}
      >
        <div className="flex items-center gap-1">
          {label}
          {isActive ? (
            sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
          )}
        </div>
      </TableHead>
    );
  };

  const formatSignupDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <>
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-foreground">Users Overview</CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Circle className="h-2.5 w-2.5 fill-green-500 text-green-500" />
              <span>{onlineUsers.length} online now</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Columns3 className="h-4 w-4" /> Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Optional columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(Object.keys(COLUMN_LABELS) as OptionalColumnKey[]).map((key) => (
                  <DropdownMenuCheckboxItem
                    key={key}
                    checked={isVisible(key)}
                    onCheckedChange={() => toggleCol(key)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {COLUMN_LABELS[key]}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>No users found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <SortableHeader label="User" sortKeyName="full_name" />
                    {isVisible('role') && <SortableHeader label="Role" sortKeyName="role" />}
                    {isVisible('posts_count') && <SortableHeader label="Posts" sortKeyName="posts_count" />}
                    {isVisible('goals') && <SortableHeader label="Goals (a / ✓)" sortKeyName="goals_active" />}
                    {isVisible('habits_count') && <SortableHeader label="Habits" sortKeyName="habits_count" />}
                    {isVisible('check_ins_total') && <SortableHeader label="Check-ins" sortKeyName="check_ins_total" />}
                    {isVisible('days_active') && <SortableHeader label="Days active" sortKeyName="days_active" />}
                    {isVisible('total_time_seconds') && <SortableHeader label="Time" sortKeyName="total_time_seconds" />}
                    {isVisible('engagement') && <SortableHeader label="Engagement" sortKeyName="engagement" />}
                    {isVisible('country_city') && <SortableHeader label="Location" sortKeyName="country" />}
                    {isVisible('phone_verified') && <SortableHeader label="Phone" sortKeyName="phone_verified" />}
                    {isVisible('tos_accepted_at') && <SortableHeader label="ToS Accepted" sortKeyName="tos_accepted_at" />}
                    <SortableHeader label="Signup" sortKeyName="created_at" />
                    <SortableHeader label="Last Active" sortKeyName="last_active_at" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedUsers.map((user) => {
                    const isOnline = onlineUserIds.has(user.id);
                    const engagement = getEngagementScore(user);
                    const location = [user.city, user.country].filter(Boolean).join(', ');

                    return (
                      <TableRow
                        key={user.id}
                        className="border-border cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => handleUserClick(user)}
                      >
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="relative">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.avatar_url} />
                                <AvatarFallback className="bg-primary text-primary-foreground">
                                  <User className="h-4 w-4" />
                                </AvatarFallback>
                              </Avatar>
                              {isOnline && (
                                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 border-2 border-background rounded-full" />
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-foreground font-medium">{user.full_name}</span>
                              <span className="text-xs text-muted-foreground">{user.email}</span>
                            </div>
                          </div>
                        </TableCell>
                        {isVisible('role') && (
                          <TableCell>
                            <Badge variant={user.role === 'admin' ? "destructive" : "secondary"}>
                              {user.role}
                            </Badge>
                          </TableCell>
                        )}
                        {isVisible('posts_count') && (
                          <TableCell><span className="text-foreground">{user.posts_count}</span></TableCell>
                        )}
                        {isVisible('goals') && (
                          <TableCell>
                            <span className="text-foreground tabular-nums">
                              {user.goals_active ?? 0} / {user.goals_completed ?? 0}
                            </span>
                          </TableCell>
                        )}
                        {isVisible('habits_count') && (
                          <TableCell><span className="text-foreground tabular-nums">{user.habits_count ?? 0}</span></TableCell>
                        )}
                        {isVisible('check_ins_total') && (
                          <TableCell><span className="text-foreground tabular-nums">{user.check_ins_total ?? 0}</span></TableCell>
                        )}
                        {isVisible('days_active') && (
                          <TableCell><span className="text-foreground tabular-nums">{user.days_active ?? 0}</span></TableCell>
                        )}
                        {isVisible('total_time_seconds') && (
                          <TableCell><span className="text-foreground">{formatDuration(user.total_time_seconds || 0)}</span></TableCell>
                        )}
                        {isVisible('engagement') && (
                          <TableCell>
                            <div className="flex flex-col text-xs">
                              <span className="text-foreground font-medium">{formatNumber(engagement)}</span>
                              <span className="text-muted-foreground">
                                {formatNumber(user.total_clicks || 0)}c / {formatNumber(user.total_scrolls || 0)}s / {formatNumber(user.total_keypresses || 0)}k
                              </span>
                            </div>
                          </TableCell>
                        )}
                        {isVisible('country_city') && (
                          <TableCell>
                            <span className="text-foreground text-sm">{location || <span className="text-muted-foreground">—</span>}</span>
                          </TableCell>
                        )}
                        {isVisible('phone_verified') && (
                          <TableCell>
                            {user.phone_verified ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <X className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                        )}
                        {isVisible('tos_accepted_at') && (
                          <TableCell>
                            {user.tos_accepted_at ? (
                              <div className="flex flex-col text-xs">
                                <span className="text-foreground">
                                  {new Date(user.tos_accepted_at).toLocaleDateString()}
                                </span>
                                <span className="text-muted-foreground">v{user.tos_version || '?'}</span>
                              </div>
                            ) : (
                              <span className="text-destructive text-sm">Not accepted</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell>
                          <span className="text-foreground text-sm whitespace-nowrap">
                            {formatSignupDate(user.created_at)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground text-sm">
                            {user.last_active_at
                              ? formatTimeAgo(new Date(user.last_active_at).getTime())
                              : 'Never'}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <UserDetailDrawer
        user={selectedUser}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onUserDeleted={onUserDeleted}
      />
    </>
  );
};

export default UsersOverview;
