import { UnifiedPost } from "@/services/unifiedPostsService";

interface CompactFeedPostContentProps {
  post: UnifiedPost;
}

export const CompactFeedPostContent = ({ post }: CompactFeedPostContentProps) => {
  if (!post.accomplishments && !post.priorities && !post.help && !post.reflection) return null;

  const lines = (post.accomplishments || '').split('\n').filter(line => line.trim() !== '');
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
    <div className="space-y-2.5">
      {/* Completed Objectives */}
      {sections.completed.length > 0 && (
        <div className="bg-emerald-500/5 rounded-md p-2.5 border border-emerald-500/15">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
            <h4 className="text-emerald-300 font-medium text-xs">Completed</h4>
          </div>
          <div className="space-y-1.5">
            {sections.completed.map((objective, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="flex-shrink-0 w-3 h-3 rounded-full bg-emerald-500 flex items-center justify-center mt-0.5">
                  <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-foreground text-xs leading-relaxed">{objective}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Incomplete Objectives */}
      {sections.incomplete.length > 0 && (
        <div className="bg-amber-500/5 rounded-md p-2.5 border border-amber-500/15">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
            <h4 className="text-amber-300 font-medium text-xs">In Progress</h4>
          </div>
          <div className="space-y-2">
            {sections.incomplete.map((objective, index) => {
              const reflection = sections.incompleteReflections.find(ref => 
                ref.toLowerCase().includes(objective.toLowerCase().substring(0, 10)) ||
                objective.toLowerCase().includes(ref.toLowerCase().substring(0, 10))
              ) || sections.incompleteReflections[index];

              return (
                <div key={index} className="space-y-1">
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 w-3 h-3 rounded-full border border-amber-400 bg-transparent mt-0.5" />
                    <p className="text-foreground text-xs leading-relaxed">{objective}</p>
                  </div>
                  {reflection && (
                    <div className="ml-5 text-xs">
                      <div className="bg-amber-500/5 rounded px-2 py-1 border-l border-amber-400/30">
                        <p className="text-amber-200/70 text-xs leading-relaxed">{reflection}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Next Priorities */}
      {post.priorities && (
        <div className="bg-purple-500/5 rounded-md p-2.5 border border-purple-500/15">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
            <h4 className="text-purple-300 font-medium text-xs">Next Priorities</h4>
          </div>
          <div className="space-y-1">
            {post.priorities.split('\n').map((line, index) => {
              if (line.trim() === '' || line.includes('Remaining objectives for next week:')) return null;
              
              if (line.startsWith('• ')) {
                const objectiveText = line.substring(2);
                return (
                  <div key={index} className="flex items-start gap-2">
                    <div className="flex-shrink-0 w-3 h-3 rounded-full border border-purple-400 bg-transparent mt-0.5" />
                    <p className="text-foreground text-xs leading-relaxed">{objectiveText}</p>
                  </div>
                );
              }
              
              return (
                <p key={index} className="text-foreground/90 text-xs leading-relaxed">
                  {line}
                </p>
              );
            }).filter(Boolean)}
          </div>
        </div>
      )}

      {/* Help Needed */}
      {post.help && (
        <div className="bg-blue-500/5 rounded-md p-2.5 border border-blue-500/15">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
            <h4 className="text-blue-300 font-medium text-xs">Help Needed</h4>
          </div>
          <div className="space-y-1">
            {post.help.split('\n').map((line, index) => {
              if (line.trim() === '' || line.includes('Help needed:')) return null;
              
              if (line.startsWith('• ')) {
                const text = line.substring(2);
                return <p key={index} className="text-foreground/90 text-xs leading-relaxed">{text}</p>;
              }
              
              return <p key={index} className="text-foreground/90 text-xs leading-relaxed">{line}</p>;
            }).filter(Boolean)}
          </div>
        </div>
      )}

      {/* Weekly Reflection */}
      {post.reflection && post.reflection.trim() && (
        <div className="bg-muted/10 rounded-md p-2.5 border border-muted/20">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full"></div>
            <h4 className="text-muted-foreground font-medium text-xs">Reflection</h4>
          </div>
          <p className="text-foreground/90 text-xs leading-relaxed">{post.reflection}</p>
        </div>
      )}

      {/* Legacy Weekly Reflections */}
      {sections.generalReflections.length > 0 && (
        <div className="bg-muted/10 rounded-md p-2.5 border border-muted/20">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full"></div>
            <h4 className="text-muted-foreground font-medium text-xs">Reflections</h4>
          </div>
          <div className="space-y-1">
            {sections.generalReflections.map((reflection, index) => (
              <p key={index} className="text-foreground/90 text-xs leading-relaxed">{reflection}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};