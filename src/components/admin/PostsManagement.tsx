
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Trash2, User } from "lucide-react";
import { formatTimeAgo } from "@/utils/timeUtils";

interface AdminPost {
  id: string;
  name: string;
  accomplishments: string;
  priorities: string;
  help: string;
  created_at: string;
  hidden: boolean;
  user_id: string;
  likes?: number;
  profiles: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  comments?: Array<any>;
}

interface PostsManagementProps {
  posts: AdminPost[];
  onToggleVisibility: (postId: string, currentlyHidden: boolean) => void;
  onDeletePost: (postId: string) => void;
}

const PostsManagement = ({ posts, onToggleVisibility, onDeletePost }: PostsManagementProps) => {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Posts Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-foreground">User</TableHead>
                  <TableHead className="text-foreground">Content</TableHead>
                  <TableHead className="text-foreground">Engagement</TableHead>
                  <TableHead className="text-foreground">Created</TableHead>
                  <TableHead className="text-foreground">Status</TableHead>
                  <TableHead className="text-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {posts.map((post) => (
                <TableRow key={post.id} className="border-border">
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={post.profiles?.avatar_url} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <User className="h-4 w-4" />
                </AvatarFallback>
                      </Avatar>
                      <div>
                <div className="text-foreground text-sm font-medium">
                  {post.profiles?.full_name || post.name}
                </div>
                <div className="text-muted-foreground text-xs">
                  {post.profiles?.email}
                </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-md">
                {post.accomplishments && (
                  <div className="text-foreground text-sm mb-1">
                    <strong>Accomplishments:</strong> {post.accomplishments.substring(0, 100)}...
                  </div>
                )}
                {post.priorities && (
                  <div className="text-foreground text-sm mb-1">
                    <strong>Priorities:</strong> {post.priorities.substring(0, 100)}...
                  </div>
                )}
                {post.help && (
                  <div className="text-foreground text-sm">
                    <strong>Help:</strong> {post.help.substring(0, 100)}...
                  </div>
                )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
              <div className="flex items-center space-x-2 text-muted-foreground text-sm">
                <span>👍 {post.likes || 0}</span>
                <span>💬 {post.comments?.length || 0}</span>
              </div>
                    </div>
                  </TableCell>
                  <TableCell>
            <span className="text-muted-foreground text-sm">
              {formatTimeAgo(new Date(post.created_at).getTime())}
            </span>
                  </TableCell>
                  <TableCell>
            <Badge 
              variant={post.hidden ? "destructive" : "secondary"}
            >
              {post.hidden ? "Hidden" : "Visible"}
            </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleVisibility(post.id, post.hidden)}
            className="text-muted-foreground hover:bg-accent"
          >
                        {post.hidden ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDeletePost(post.id)}
            className="text-destructive hover:bg-destructive/10"
          >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default PostsManagement;
