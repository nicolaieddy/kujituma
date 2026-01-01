import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { formatTimeAgo } from "@/utils/timeUtils";
import UserDetailDrawer from "./UserDetailDrawer";

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
}

interface UsersOverviewProps {
  users: AdminUser[];
}

type SortKey = 'full_name' | 'email' | 'role' | 'posts_count' | 'last_active_at' | 'created_at' | 'total_time_seconds' | 'days_active';
type SortDirection = 'asc' | 'desc';

const formatDuration = (seconds: number): string => {
  if (seconds === 0) return '0m';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

const UsersOverview = ({ users }: UsersOverviewProps) => {
  const [sortKey, setSortKey] = useState<SortKey>('last_active_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      let aVal: string | number | null = null;
      let bVal: string | number | null = null;

      switch (sortKey) {
        case 'full_name':
          aVal = a.full_name.toLowerCase();
          bVal = b.full_name.toLowerCase();
          break;
        case 'email':
          aVal = a.email.toLowerCase();
          bVal = b.email.toLowerCase();
          break;
        case 'role':
          aVal = a.role || '';
          bVal = b.role || '';
          break;
        case 'posts_count':
          aVal = a.posts_count;
          bVal = b.posts_count;
          break;
        case 'last_active_at':
          aVal = a.last_active_at ? new Date(a.last_active_at).getTime() : 0;
          bVal = b.last_active_at ? new Date(b.last_active_at).getTime() : 0;
          break;
        case 'created_at':
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        case 'total_time_seconds':
          aVal = a.total_time_seconds || 0;
          bVal = b.total_time_seconds || 0;
          break;
        case 'days_active':
          aVal = a.days_active || 0;
          bVal = b.days_active || 0;
          break;
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
        className="text-foreground cursor-pointer hover:bg-accent/50 transition-colors select-none"
        onClick={() => handleSort(sortKeyName)}
      >
        <div className="flex items-center gap-1">
          {label}
          {isActive ? (
            sortDirection === 'asc' ? (
              <ArrowUp className="h-3.5 w-3.5" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5" />
            )
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
          )}
        </div>
      </TableHead>
    );
  };

  return (
    <>
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Users Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>No users found. Check the console for debugging information.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <SortableHeader label="User" sortKeyName="full_name" />
                    <SortableHeader label="Email" sortKeyName="email" />
                    <SortableHeader label="Role" sortKeyName="role" />
                    <SortableHeader label="Posts" sortKeyName="posts_count" />
                    <SortableHeader label="Time Spent" sortKeyName="total_time_seconds" />
                    <SortableHeader label="Days Active" sortKeyName="days_active" />
                    <SortableHeader label="Last Active" sortKeyName="last_active_at" />
                    <SortableHeader label="Joined" sortKeyName="created_at" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedUsers.map((user) => (
                    <TableRow 
                      key={user.id} 
                      className="border-border cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => handleUserClick(user)}
                    >
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-foreground font-medium">{user.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">{user.email}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? "destructive" : "secondary"}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-foreground">{user.posts_count}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-foreground">
                          {formatDuration(user.total_time_seconds || 0)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-foreground">{user.days_active || 0}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">
                          {user.last_active_at
                            ? formatTimeAgo(new Date(user.last_active_at).getTime())
                            : 'Never'
                          }
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">
                          {formatTimeAgo(new Date(user.created_at).getTime())}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
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
      />
    </>
  );
};

export default UsersOverview;
