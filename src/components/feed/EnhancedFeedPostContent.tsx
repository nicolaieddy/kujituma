import { UnifiedPost } from "@/services/unifiedPostsService";
import { EnhancedObjectiveDisplay } from "./EnhancedObjectiveDisplay";
import { MessageCircle, Lightbulb } from "lucide-react";
import MDEditor from '@uiw/react-md-editor';

interface EnhancedFeedPostContentProps {
  post: UnifiedPost;
}

export const EnhancedFeedPostContent = ({ post }: EnhancedFeedPostContentProps) => {
  if (!post.accomplishments) return null;

  const lines = post.accomplishments.split('\n').filter(line => line.trim() !== '');
  const sections = {
    completed: [] as string[],
    incomplete: [] as string[],
    incompleteReflections: [] as string[],
    generalReflections: [] as string[],
    currentSection: null as string | null
  };
  
  lines.forEach(line => {
    if (line.includes('Completed Objectives:')) {
      sections.currentSection = 'completed';
    } else if (line.includes('Incomplete Objectives:')) {
      sections.currentSection = 'incomplete';
    } else if (line.includes('Reflections on Incomplete Objectives:')) {
      sections.currentSection = 'incompleteReflections';
    } else if (line.includes('Weekly Reflections:')) {
      sections.currentSection = 'generalReflections';
    } else if (sections.currentSection && line.startsWith('• ')) {
      sections[sections.currentSection].push(line.substring(2));
    } else if (sections.currentSection === 'generalReflections' && !line.includes(':')) {
      sections.generalReflections.push(line);
    } else if (sections.currentSection === 'incompleteReflections' && !line.includes(':')) {
      sections.incompleteReflections.push(line);
    }
  });

  return (
    <div className="space-y-6">
      {/* Completed Objectives */}
      <EnhancedObjectiveDisplay
        objectives={sections.completed}
        type="completed"
        showReflections={false}
      />

      {/* In Progress Objectives */}
      <EnhancedObjectiveDisplay
        objectives={sections.incomplete}
        reflections={sections.incompleteReflections}
        type="inProgress"
        showReflections={true}
      />

      {/* Weekly Reflections */}
      {sections.generalReflections.length > 0 && (
        <div className="bg-blue-500/10 rounded-xl p-5 border border-blue-500/20 shadow-lg shadow-blue-500/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Lightbulb className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <h4 className="text-blue-200 font-semibold text-base">Weekly Reflections</h4>
              <p className="text-white/60 text-xs">Key insights and learnings</p>
            </div>
          </div>
          
          <div className="space-y-3">
            {sections.generalReflections.map((reflection, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center mt-1">
                  <MessageCircle className="h-4 w-4 text-blue-400" />
                </div>
                <div className="flex-1 bg-white/95 text-gray-800 rounded-lg p-4 shadow-sm">
                  <div className="prose prose-gray prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_em]:italic">
                    <MDEditor.Markdown source={reflection} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-xs">Personal insights</span>
              <div className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300">
                {sections.generalReflections.length} reflection{sections.generalReflections.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};