
export interface CommentType {
  id: string;
  name: string;
  message: string;
  timestamp: number;
  avatar_url?: string;
}

export interface ProgressPostType {
  id: string;
  name: string;
  accomplishments: string;
  priorities: string;
  help: string;
  timestamp: number;
  comments: CommentType[];
  avatar_url?: string;
  user_id?: string;
}
