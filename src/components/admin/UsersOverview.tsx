
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
    <Card className="bg-white/10 backdrop-blur-lg border-white/20">
      <CardHeader>
        <CardTitle className="text-white">Users Overview</CardTitle>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <div className="text-center text-white/80 py-8">
            <p>No users found. Check the console for debugging information.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/20">
                  <TableHead className="text-white/80">User</TableHead>
                  <TableHead className="text-white/80">Email</TableHead>
                  <TableHead className="text-white/80">Role</TableHead>
                  <TableHead className="text-white/80">Posts</TableHead>
                  <TableHead className="text-white/80">Last Active</TableHead>
                  <TableHead className="text-white/80">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="border-white/20">
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-white font-medium">{user.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-white/80">{user.email}</span>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={user.role === 'admin' ? "destructive" : "default"}
                        className={
                          user.role === 'admin' 
                            ? "bg-purple-500/20 text-purple-400" 
                            : "bg-blue-500/20 text-blue-400"
                        }
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-white/80">{user.posts_count}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-white/60 text-sm">
                        {user.last_active_at 
                          ? formatTimeAgo(new Date(user.last_active_at).getTime())
                          : 'Never'
                        }
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-white/60 text-sm">
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
