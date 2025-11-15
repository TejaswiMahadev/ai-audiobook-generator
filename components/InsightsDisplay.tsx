import React from 'react';
import type { ScriptSection } from '../types';

interface InsightsDisplayProps {
  summary: string;
  script: ScriptSection[];
  currentHighlight: number;
}

export const InsightsDisplay: React.FC<InsightsDisplayProps> = ({ summary, script, currentHighlight }) => {
  const sectionStartIndices = React.useMemo(() => {
    const indices = [0];
    if (!script) return indices;
    let total = 0;
    for (let i = 0; i < script.length - 1; i++) {
      total += script[i].paragraphs.length;
      indices.push(total);
    }
    return indices;
  }, [script]);

  return (
    <div>
      <div className="p-6 bg-slate-800/50 border-b border-slate-700 ">
        <h2 className="text-2xl font-bold text-white mb-4">Summary</h2>
        <div className="space-y-6 pr-2">
          <p className="text-gray-300 prose prose-invert max-w-none">{summary}</p>
        </div>
      </div>
      
      <div className="p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Full Script</h2>
        <div className="space-y-8 pr-2">
          {script.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              <h3 className="text-xl font-semibold text-cyan-300 mb-3 sticky top-0 bg-slate-900/50 py-2 -my-2 backdrop-blur-sm">
                {section.title}
              </h3>
              <div className="space-y-4">
                {section.paragraphs.map((paragraph, paragraphIndex) => {
                  const globalParagraphIndex = sectionStartIndices[sectionIndex] + paragraphIndex;
                  const isHighlighted = currentHighlight === globalParagraphIndex;
                  return (
                    <p
                      key={paragraphIndex}
                      id={`paragraph-${globalParagraphIndex}`}
                      className={`text-gray-200 leading-relaxed transition-all duration-300 p-3 rounded-lg ${
                        isHighlighted
                          ? 'bg-cyan-500/20 scale-[1.02]'
                          : 'bg-transparent'
                      }`}
                    >
                      {paragraph}
                    </p>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};