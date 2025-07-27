import { CheckCircle2, Circle, Clock, MessageSquare } from "lucide-react";

interface ObjectiveDisplayProps {
  objectives: string[];
  reflections?: string[];
  type: 'completed' | 'inProgress';
  showReflections?: boolean;
}

export const EnhancedObjectiveDisplay = ({ 
  objectives, 
  reflections = [], 
  type, 
  showReflections = true 
}: ObjectiveDisplayProps) => {
  if (objectives.length === 0) return null;

  const isCompleted = type === 'completed';
  
  const config = {
    completed: {
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      iconBg: 'bg-emerald-500',
      textColor: 'text-emerald-300',
      titleColor: 'text-emerald-200',
      objectiveTextColor: 'text-white',
      icon: CheckCircle2,
      title: 'Completed Objectives',
      glowColor: 'shadow-emerald-500/20'
    },
    inProgress: {
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      iconBg: 'bg-amber-500/20',
      textColor: 'text-amber-300',
      titleColor: 'text-amber-200',
      objectiveTextColor: 'text-white',
      icon: Clock,
      title: 'Not Accomplished',
      glowColor: 'shadow-amber-500/20'
    }
  };

  const style = config[type];
  const IconComponent = style.icon;

  return (
    <div className={`${style.bgColor} rounded-xl p-5 border ${style.borderColor} ${style.glowColor} shadow-lg`}>
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-8 h-8 rounded-full ${isCompleted ? style.iconBg : 'border-2 border-amber-400'} flex items-center justify-center`}>
          {isCompleted ? (
            <CheckCircle2 className="h-4 w-4 text-white" />
          ) : (
            <Clock className="h-4 w-4 text-amber-400" />
          )}
        </div>
        <div>
          <h4 className={`${style.titleColor} font-semibold text-base`}>
            {style.title}
          </h4>
          <p className="text-white/60 text-xs">
            {objectives.length} objective{objectives.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Objectives List */}
      <div className="space-y-3">
        {objectives.map((objective, index) => {
          const reflection = reflections[index];
          
          return (
            <div key={index} className="space-y-2">
              {/* Objective Item */}
              <div className="flex items-start gap-3 group">
                <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-1 ${
                  isCompleted 
                    ? 'bg-emerald-500' 
                    : 'border-2 border-amber-400 bg-transparent'
                }`}>
                  {isCompleted && (
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`${style.objectiveTextColor} font-medium leading-relaxed ${
                    isCompleted ? 'line-through decoration-2 decoration-emerald-400/50' : ''
                  }`}>
                    {objective}
                  </p>
                  {isCompleted && (
                    <div className="flex items-center gap-1 mt-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      <span className="text-emerald-400 text-xs font-medium">Complete</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Reflection */}
              {!isCompleted && reflection && showReflections && (
                <div className="ml-8">
                  <div className="bg-amber-500/5 rounded-lg p-3 border-l-2 border-amber-400/50">
                    <div className="flex items-center gap-1 mb-1">
                      <MessageSquare className="h-3 w-3 text-amber-400" />
                      <span className="text-amber-300 text-xs font-medium uppercase tracking-wide">
                        Progress Update
                      </span>
                    </div>
                    <p className="text-amber-200/90 text-sm leading-relaxed">
                      {reflection}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Badge */}
      <div className="mt-4 pt-3 border-t border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-white/60 text-xs">
            {isCompleted ? 'All objectives completed' : 'Objectives not accomplished'}
          </span>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            isCompleted 
              ? 'bg-emerald-500/20 text-emerald-300' 
              : 'bg-amber-500/20 text-amber-300'
          }`}>
            {objectives.length} {objectives.length === 1 ? 'item' : 'items'}
          </div>
        </div>
      </div>
    </div>
  );
};