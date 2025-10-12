
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";
import { formatTimeAgo } from "@/utils/timeUtils";

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
  posts_count: number;
  role?: string;
  last_active_at?: string;
}

interface UsersOverviewProps {
  users: AdminUser[];
}

const UsersOverview = ({ users }: UsersOverviewProps) => {
  return (
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
                  <TableHead className="text-foreground">User</TableHead>
                  <TableHead className="text-foreground">Email</TableHead>
                  <TableHead className="text-foreground">Role</TableHead>
                  <TableHead className="text-foreground">Posts</TableHead>
                  <TableHead className="text-foreground">Last Active</TableHead>
                  <TableHead className="text-foreground">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="border-border">
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
          <Badge 
            variant={user.role === 'admin' ? "destructive" : "secondary"}
          >
            {user.role}
          </Badge>
                    </TableCell>
                    <TableCell>
          <span className="text-foreground">{user.posts_count}</span>
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
  );
};

export default UsersOverview;
