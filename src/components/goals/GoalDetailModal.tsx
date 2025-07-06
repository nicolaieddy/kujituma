import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Goal, GoalStatus } from "@/types/goals";
import { WeeklyObjective } from "@/types/weeklyProgress";
import { GoalForm } from "./GoalForm";
import { GoalDetailOverview } from "./GoalDetailOverview";
import { GoalObjectivesList } from "./GoalObjectivesList";
import { formatRelativeTime } from "@/utils/dateUtils";
import { Edit, CheckCircle, Play, Clock, Trash2 } from "lucide-react";

interface GoalDetailModalProps {
  goal: Goal | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: GoalStatus) => void;
  weeklyObjectives: WeeklyObjective[];
  onCreateObjective: (goalId: string, text: string) => void;
  onUpdateObjective: (id: string, updates: any) => void;
  onDeleteObjective: (id: string) => void;
}

const STATUS_CONFIG = {
  coming_up: { 
    color: "bg-blue-100 text-blue-800", 
    icon: Clock, 
    label: "Coming Up" 
  },
  in_progress: { 
    color: "bg-yellow-100 text-yellow-800", 
    icon: Play, 
    label: "In Progress" 
  },
  completed: { 
    color: "bg-green-100 text-green-800", 
    icon: CheckCircle, 
    label: "Completed" 
  }
};

export const GoalDetailModal = ({
  goal,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
  weeklyObjectives,
  onCreateObjective,
  onUpdateObjective,
  onDeleteObjective,
}: GoalDetailModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  if (!goal) return null;

  const config = STATUS_CONFIG[goal.status];
  const IconComponent = config.icon;
  const relatedObjectives = weeklyObjectives.filter(obj => obj.goal_id === goal.id);

  const handleStatusChange = (newStatus: GoalStatus) => {
    if (newStatus !== goal.status) {
      onStatusChange(goal.id, newStatus);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = (data: any) => {
    onEdit({ ...goal, ...data });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900/95 backdrop-blur-lg border-white/20">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <IconComponent className="h-5 w-5 text-white" />
                <Badge className={`${config.color} text-sm`}>
                  {config.label}
                </Badge>
              </div>
              <DialogTitle className="text-2xl text-white">
                {goal.title}
              </DialogTitle>
            </div>
            <div className="flex gap-2">
              {!isEditing && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEdit}
                    className="text-white hover:bg-white/20"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  {goal.status === 'coming_up' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStatusChange('in_progress')}
                      className="text-white hover:bg-white/20"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start
                    </Button>
                  )}
                  {goal.status === 'in_progress' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStatusChange('completed')}
                      className="text-white hover:bg-white/20"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(goal.id)}
                    className="text-red-400 hover:bg-red-500/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        {isEditing ? (
          <div className="mt-6">
            <GoalForm
              onSubmit={handleSave}
              onCancel={handleCancel}
              initialData={goal}
            />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="grid w-full grid-cols-2 bg-white/10">
              <TabsTrigger value="overview" className="text-white data-[state=active]:bg-white/20">
                Overview
              </TabsTrigger>
              <TabsTrigger value="objectives" className="text-white data-[state=active]:bg-white/20">
                Weekly Objectives ({relatedObjectives.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="mt-6">
              <GoalDetailOverview goal={goal} />
            </TabsContent>
            
            <TabsContent value="objectives" className="mt-6">
              <GoalObjectivesList
                goal={goal}
                objectives={relatedObjectives}
                onCreateObjective={onCreateObjective}
                onUpdateObjective={onUpdateObjective}
                onDeleteObjective={onDeleteObjective}
              />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};