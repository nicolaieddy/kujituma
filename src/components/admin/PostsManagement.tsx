
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
    <Card className="bg-white/10 backdrop-blur-lg border-white/20">
      <CardHeader>
        <CardTitle className="text-white">Posts Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/20">
                  <TableHead className="text-white/80">User</TableHead>
                  <TableHead className="text-white/80">Content</TableHead>
                  <TableHead className="text-white/80">Engagement</TableHead>
                  <TableHead className="text-white/80">Created</TableHead>
                  <TableHead className="text-white/80">Status</TableHead>
                  <TableHead className="text-white/80">Actions</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {posts.map((post) => (
                <TableRow key={post.id} className="border-white/20">
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={post.profiles?.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-white text-sm font-medium">
                          {post.profiles?.full_name || post.name}
                        </div>
                        <div className="text-white/60 text-xs">
                          {post.profiles?.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-md">
                      {post.accomplishments && (
                        <div className="text-white/80 text-sm mb-1">
                          <strong>Accomplishments:</strong> {post.accomplishments.substring(0, 100)}...
                        </div>
                      )}
                      {post.priorities && (
                        <div className="text-white/80 text-sm mb-1">
                          <strong>Priorities:</strong> {post.priorities.substring(0, 100)}...
                        </div>
                      )}
                      {post.help && (
                        <div className="text-white/80 text-sm">
                          <strong>Help:</strong> {post.help.substring(0, 100)}...
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-white/80 text-sm">
                        <span>👍 {post.likes || 0}</span>
                        <span>💬 {post.comments?.length || 0}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-white/60 text-sm">
                      {formatTimeAgo(new Date(post.created_at).getTime())}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={post.hidden ? "destructive" : "default"}
                      className={post.hidden ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}
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
                        className="text-white/80 hover:bg-white/20"
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
                        className="text-red-400 hover:bg-red-500/20"
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
