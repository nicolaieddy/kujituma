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
    <div>
      <h4 className="text-white font-semibold mb-4 text-lg">Weekly Progress</h4>
      <div className="space-y-4">
        {/* Completed Objectives */}
        {sections.completed.length > 0 && (
          <div>
            <h5 className="text-green-400 font-medium mb-3">Completed</h5>
            <div className="space-y-2">
              {sections.completed.map((objective, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded bg-green-500 border-2 border-green-500 flex items-center justify-center mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-white/90">{objective}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Incomplete Objectives with Reflections */}
        {sections.incomplete.length > 0 && (
          <div>
            <h5 className="text-orange-400 font-medium mb-3">Incomplete</h5>
            <div className="space-y-3">
              {sections.incomplete.map((objective, index) => {
                // Try to find a matching reflection for this objective
                const reflection = sections.incompleteReflections.find(ref => 
                  ref.toLowerCase().includes(objective.toLowerCase().substring(0, 10)) ||
                  objective.toLowerCase().includes(ref.toLowerCase().substring(0, 10))
                ) || sections.incompleteReflections[index];

                return (
                  <div key={index} className="bg-white/5 rounded-lg p-3">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="flex-shrink-0 w-5 h-5 rounded border-2 border-orange-400/60 bg-transparent mt-0.5" />
                      <span className="text-white/80">{objective}</span>
                    </div>
                    {reflection && (
                      <div className="ml-8 bg-white/5 rounded p-2">
                        <p className="text-orange-200 text-sm italic">"{reflection}"</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* General Weekly Reflections */}
        {sections.generalReflections.length > 0 && (
          <div>
            <h5 className="text-blue-400 font-medium mb-3">Weekly Reflections</h5>
            <div className="bg-white/5 rounded-lg p-3">
              {sections.generalReflections.map((reflection, index) => (
                <p key={index} className="text-white/80 mb-2 last:mb-0">{reflection}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};