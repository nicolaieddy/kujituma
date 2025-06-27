
export interface Comment {
  id: string;
  name: string;
  message: string;
  timestamp: number;
}

export interface ProgressPostType {
  id: string;
  name: string;
  timestamp: number;
  accomplishments: string;
  priorities: string;
  help: string;
  comments: Comment[];
}
