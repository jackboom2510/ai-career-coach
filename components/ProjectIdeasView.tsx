import React from 'react';
import { ProjectIdea } from '../types';
import { Briefcase, Wrench, Trophy, Code2, BarChart3, Globe } from 'lucide-react';

interface Props {
  projects: ProjectIdea[];
}

const ProjectIdeasView: React.FC<Props> = ({ projects }) => {
  
  const getDifficultyColor = (diff: string) => {
    switch (diff) {
        case 'Beginner': return 'bg-green-100 text-green-700';
        case 'Intermediate': return 'bg-blue-100 text-blue-700';
        case 'Advanced': return 'bg-purple-100 text-purple-700';
        default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getIcon = (index: number) => {
      const icons = [Code2, BarChart3, Globe, Wrench, Briefcase];
      const Icon = icons[index % icons.length];
      return <Icon className="w-6 h-6 text-white" />;
  };

  return (
    <div className="h-full overflow-y-auto px-1">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
        <div className="md:col-span-2 mb-2">
            <h2 className="text-2xl font-bold text-slate-800">Portfolio Projects</h2>
            <p className="text-slate-600 mt-1">
                Build these to prove your skills. Focused on real-world impact for your resume.
            </p>
        </div>

        {projects.map((project, index) => (
          <div 
            key={index} 
            className="group bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-300 flex flex-col"
          >
            <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br ${
                    index % 2 === 0 ? 'from-indigo-500 to-blue-500' : 'from-purple-500 to-pink-500'
                }`}>
                    {getIcon(index)}
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${getDifficultyColor(project.difficulty)}`}>
                    {project.difficulty}
                </span>
            </div>

            <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">
                {project.title}
            </h3>
            
            <div className="mb-4 flex-grow">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">The Problem</h4>
                <p className="text-sm text-slate-600 leading-relaxed">{project.problem}</p>
            </div>

            <div className="space-y-4">
                <div className="bg-slate-50 rounded-lg p-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Wrench className="w-3 h-3" /> Tech Stack
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {project.tools.map((tool, tIdx) => (
                            <span key={tIdx} className="text-xs bg-white border border-slate-200 text-slate-700 px-2 py-1 rounded-md shadow-sm">
                                {tool}
                            </span>
                        ))}
                    </div>
                </div>

                <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Trophy className="w-3 h-3" /> Outcome
                    </h4>
                    <p className="text-sm font-medium text-slate-800">{project.outcome}</p>
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectIdeasView;
