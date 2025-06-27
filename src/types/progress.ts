
export interface CommentType {
  id: string;
  name: string;
  message: string;
  timestamp: number;
}

export interface ProgressPostType {
  id: string;
  name: string;
  accomplishments: string;
  priorities: string;
  help: string;
  timestamp: number;
  comments: CommentType[];
}
