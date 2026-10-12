import React, { useState } from 'react';
import { Button } from '~/components/ui/Button';

export interface QuestionData {
  title?: string;
  question: string;
  options: string[];
}

interface QuestionOverlayProps {
  questions: QuestionData[];
  onSubmit: (answers: Record<string, string>) => void;
  onSkipAll: () => void;
}

export const QuestionOverlay: React.FC<QuestionOverlayProps> = ({ questions, onSubmit, onSkipAll }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [customText, setCustomText] = useState('');

  const currentQuestion = questions[currentIndex];

  
  const currentAnswer = answers[`q${currentIndex}`];
  const hasAnswer = currentAnswer !== undefined && currentAnswer.trim() !== '';

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setCustomText('');
    } else {
      
      onSubmit(answers);
    }
  };

  const handleSkip = () => {
    
    const newAnswers = { ...answers, [`q${currentIndex}`]: 'Skipped' };
    setAnswers(newAnswers);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setCustomText('');
    } else {
      onSubmit(newAnswers);
    }
  };

  const handleOptionSelect = (opt: string) => {
    if (opt !== 'custom') {
      setAnswers({ ...answers, [`q${currentIndex}`]: opt });
      setCustomText('');
    } else {
      setAnswers({ ...answers, [`q${currentIndex}`]: customText });
    }
  };

  const isCustomSelected = currentAnswer !== undefined && currentQuestion.options && !currentQuestion.options.includes(currentAnswer) && currentAnswer !== 'Skipped';

  return (
    <div className="relative w-full min-h-[150px] bg-falbor-elements-background-depth-1 z-20 flex flex-col justify-between p-4 rounded-xl overflow-hidden">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm font-semibold text-falbor-elements-textPrimary">
          {currentQuestion?.title || 'Question'}
        </h3>
        <button onClick={onSkipAll} className="text-falbor-elements-textSecondary hover:text-falbor-elements-textPrimary">
          <div className="i-ph:x text-lg" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <p className="text-md text-falbor-elements-textPrimary font-medium mb-4">{currentQuestion?.question}</p>

        <div className="flex flex-col gap-3">
          {currentQuestion?.options?.map((opt: string, i: number) => (
            <label key={i} className="flex items-center gap-2 text-sm text-falbor-elements-textSecondary cursor-pointer hover:text-falbor-elements-textPrimary">
              <input
                type="radio"
                name={`question-overlay-${currentIndex}`}
                value={opt}
                checked={currentAnswer === opt}
                onChange={() => handleOptionSelect(opt)}
                className="accent-falbor-elements-item-contentAccent w-4 h-4"
              />
              <span>{opt}</span>
            </label>
          ))}

          <label className="flex items-center gap-2 text-sm text-falbor-elements-textSecondary cursor-pointer hover:text-falbor-elements-textPrimary">
            <input
              type="radio"
              name={`question-overlay-${currentIndex}`}
              value="custom"
              checked={isCustomSelected}
              onChange={() => {
                setAnswers({ ...answers, [`q${currentIndex}`]: customText });
              }}
              className="accent-falbor-elements-item-contentAccent w-4 h-4"
            />
            <span>Other:</span>
            <input
              type="text"
              value={isCustomSelected ? currentAnswer : customText}
              onChange={(e) => {
                const val = e.target.value;
                setCustomText(val);
                setAnswers({ ...answers, [`q${currentIndex}`]: val });
              }}
              className="ml-2 bg-transparent border-b border-falbor-elements-borderColor outline-none focus:border-falbor-elements-item-contentAccent flex-1"
              placeholder="Type your answer..."
            />
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-falbor-elements-borderColor">
        <div className="text-xs text-falbor-elements-textSecondary">
          {currentIndex + 1} of {questions.length}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSkip}>
            Skip
          </Button>
          <Button variant="default" size="sm" onClick={handleNext} disabled={!hasAnswer}>
            {currentIndex < questions.length - 1 ? 'Next' : 'Submit'}
          </Button>
        </div>
      </div>
    </div>
  );
};
