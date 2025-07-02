import { UnifiedPost } from "@/services/unifiedPostsService";

interface FeedPostContentProps {
  post: UnifiedPost;
}

export const FeedPostContent = ({ post }: FeedPostContentProps) => {
  if (!post.accomplishments) return null;

  const lines = post.accomplishments.split('\n').filter(line => line.trim() !== '');
  const sections = {
    completed: [],
    incomplete: [],
    incompleteReflections: [],
    generalReflections: [],
    currentSection: null
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
      {sections.completed.length > 0 && (
        <div className="bg-emerald-500/10 rounded-lg p-5 border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
            <h4 className="text-emerald-300 font-semibold text-lg">Completed</h4>
          </div>
          <div className="space-y-3">
            {sections.completed.map((objective, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center mt-0.5">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-white font-medium leading-relaxed">{objective}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Incomplete Objectives */}
      {sections.incomplete.length > 0 && (
        <div className="bg-amber-500/10 rounded-lg p-5 border border-amber-500/20">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
            <h4 className="text-amber-300 font-semibold text-lg">In Progress</h4>
          </div>
          <div className="space-y-4">
            {sections.incomplete.map((objective, index) => {
              const reflection = sections.incompleteReflections.find(ref => 
                ref.toLowerCase().includes(objective.toLowerCase().substring(0, 10)) ||
                objective.toLowerCase().includes(ref.toLowerCase().substring(0, 10))
              ) || sections.incompleteReflections[index];

              return (
                <div key={index} className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-amber-400 bg-transparent mt-0.5" />
                    <p className="text-white font-medium leading-relaxed">{objective}</p>
                  </div>
                  {reflection && (
                    <div className="ml-8 bg-white/5 rounded-md p-3 border-l-2 border-amber-400/50">
                      <p className="text-amber-200 italic text-sm leading-relaxed">"{reflection}"</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weekly Reflections */}
      {sections.generalReflections.length > 0 && (
        <div className="bg-blue-500/10 rounded-lg p-5 border border-blue-500/20">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <h4 className="text-blue-300 font-semibold text-lg">Weekly Reflections</h4>
          </div>
          <div className="space-y-3">
            {sections.generalReflections.map((reflection, index) => (
              <p key={index} className="text-white/90 leading-relaxed">{reflection}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};