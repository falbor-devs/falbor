import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { classNames } from '~/utils/classNames';
import { useAuth } from '~/hooks/useAuth';

type StepType = 'choice' | 'rating' | 'text' | 'boolean-email';

const STEPS: { type: StepType; question: string; options: string[]; placeholder?: string }[] = [
  {
    type: 'choice',
    question: "After reading this analysis, what's the next thing you're going to do?",
    options: ["Start building the MVP", "Talk to potential users", "Improve the idea", "Abandon this idea", "I'm still not sure"],
  },
  {
    type: 'rating',
    question: "Did the analysis help you understand your idea?",
    options: ["1", "2", "3", "4", "5"],
  },
  {
    type: 'choice',
    question: "What was the most helpful part?",
    options: ["Understanding the problem", "Competitor research", "Target audience", "MVP Recommendation", "User interview questions", "Something else"],
  },
  {
    type: 'choice',
    question: "Did you learn anything new that you didn’t know before?",
    options: ["Yes", "No"],
  },
  {
    type: 'choice',
    question: "If this tool saved you hours of research on every new idea, would you consider paying for it?",
    options: ["Yes", "Maybe", "No"],
  },
  {
    type: 'choice',
    question: "If so, how much would you be willing to pay?",
    options: ["$5/month", "$10/month", "$20/month", "More", "I wouldn’t pay"],
  },
  {
    type: 'text',
    question: "What’s missing to make this a product you would use again?",
    options: [],
    placeholder: "Free text field...",
  },
  {
    type: 'boolean-email',
    question: "Would you like us to keep you updated when the product improves?",
    options: ["Yes", "No"],
  },
];

interface FeedbackWidgetProps {
  hasMessages?: boolean;
}

export function FeedbackWidget({ hasMessages = false }: FeedbackWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showThankYou, setShowThankYou] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  
  const [answers, setAnswers] = useState<{ option: string; text: string }[]>(
    Array(STEPS.length).fill({ option: '', text: '' })
  );

  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    
    
    if (loading) {
      fetch('/api/feedback')
        .then((res) => res.json())
        .then((data) => {
          if (data.hasSubmitted) {
            setHasSubmitted(true);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }

    
    
    if (!loading && !hasSubmitted && !isOpen && hasMessages) {
      setTimeout(() => setIsOpen(true), 1500); 
    }
  }, [user, hasMessages, loading, hasSubmitted, isOpen]);

  if (!user || loading || hasSubmitted) return null;

  const currentStep = STEPS[stepIndex];
  const currentAnswer = answers[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;

  const updateAnswer = (field: 'option' | 'text', value: string) => {
    const newAnswers = [...answers];
    newAnswers[stepIndex] = { ...newAnswers[stepIndex], [field]: value };
    setAnswers(newAnswers);
  };

  const handleNext = async () => {
    if (!isLastStep) {
      setStepIndex(stepIndex + 1);
      return;
    }

    
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
    } catch (e) {
      
    }

    setShowThankYou(true);
    setTimeout(() => {
      setIsOpen(false);
      setHasSubmitted(true);
    }, 2000);
  };

  const handleBack = () => {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  };

  
  const isNextDisabled = () => {
    if (currentStep.type === 'text') return currentAnswer.text.trim().length === 0;
    if (currentStep.type === 'boolean-email') {
      if (!currentAnswer.option) return true;
      if (currentAnswer.option === 'Yes' && (!currentAnswer.text || !currentAnswer.text.includes('@'))) return true;
      return false;
    }
    return !currentAnswer.option;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
          className="fixed bottom-6 right-6 z-50 w-full max-w-[440px] hidden md:block"
        >
          <Card className="shadow-2xl border-falbor-elements-borderColor overflow-hidden relative group bg-falbor-elements-background">
            {isMinimized ? (
              <div
                className="p-4 cursor-pointer flex justify-between items-center bg-falbor-elements-background-depth-2 hover:bg-falbor-elements-background-depth-3 transition-colors"
                onClick={() => setIsMinimized(false)}
              >
                <span className="font-semibold text-falbor-elements-textPrimary">Share Feedback</span>
                <span className="text-xl">💬</span>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setIsMinimized(true)}
                  className="absolute top-4 right-4 p-2 text-falbor-elements-textSecondary hover:text-falbor-elements-textPrimary z-10 transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                </button>

                {showThankYou ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-8 text-center flex flex-col items-center justify-center min-h-[300px]"
                  >
                    <div className="text-5xl mb-4">🎉</div>
                    <h3 className="text-2xl font-bold text-falbor-elements-textPrimary mb-2">Thank you!</h3>
                    <p className="text-falbor-elements-textSecondary">Your feedback helps us improve Falbor.</p>
                  </motion.div>
                ) : (
                  <>
                    <CardHeader className="pb-4 pt-6">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-purple-500 uppercase tracking-wider">
                          Feedback ({stepIndex + 1}/{STEPS.length})
                        </span>
                      </div>
                      <CardTitle className="text-lg leading-tight font-semibold text-falbor-elements-textPrimary">
                        {currentStep.question}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="flex flex-col gap-4">
                      
                      {currentStep.type === 'choice' && (
                        <div className="flex flex-col gap-2">
                          {currentStep.options.map((opt) => {
                            const isSelected = currentAnswer.option === opt;
                            return (
                              <button
                                key={opt}
                                onClick={() => updateAnswer('option', opt)}
                                className={classNames(
                                  "px-3 py-2.5 text-sm text-left rounded-md border transition-all duration-200 font-medium w-full",
                                  isSelected
                                    ? "border-purple-500 bg-purple-500/10 text-purple-500 shadow-sm"
                                    : "border-falbor-elements-borderColor text-falbor-elements-textSecondary hover:border-purple-500/40 hover:text-falbor-elements-textPrimary bg-falbor-elements-background"
                                )}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {currentStep.type === 'rating' && (
                        <div className="flex justify-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => {
                            const selectedRating = parseInt(currentAnswer.option || '0');
                            const isActive = star <= selectedRating;
                            return (
                              <button
                                key={star}
                                onClick={() => updateAnswer('option', star.toString())}
                                className="p-1 focus:outline-none hover:scale-110 transition-transform"
                              >
                                <svg 
                                  className={classNames("w-10 h-10 transition-colors", isActive ? "text-yellow-400 drop-shadow-sm" : "text-gray-300 dark:text-gray-600")}
                                  fill="currentColor" 
                                  viewBox="0 0 20 20" 
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                                </svg>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {currentStep.type === 'text' && (
                        <textarea
                          className="flex min-h-[120px] w-full rounded-md border border-falbor-elements-borderColor bg-falbor-elements-background px-3 py-2 text-sm text-falbor-elements-textPrimary placeholder:text-falbor-elements-textSecondary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-shadow"
                          placeholder={currentStep.placeholder}
                          value={currentAnswer.text}
                          onChange={(e) => updateAnswer('text', e.target.value)}
                        />
                      )}

                      {currentStep.type === 'boolean-email' && (
                        <div className="flex flex-col gap-4">
                          <div className="flex gap-2">
                            {currentStep.options.map((opt) => {
                              const isSelected = currentAnswer.option === opt;
                              return (
                                <button
                                  key={opt}
                                  onClick={() => updateAnswer('option', opt)}
                                  className={classNames(
                                    "flex-1 px-3 py-2.5 text-sm rounded-md border transition-all duration-200 font-medium",
                                    isSelected
                                      ? "border-purple-500 bg-purple-500/10 text-purple-500 shadow-sm"
                                      : "border-falbor-elements-borderColor text-falbor-elements-textSecondary hover:border-purple-500/40 hover:text-falbor-elements-textPrimary bg-falbor-elements-background"
                                  )}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                          
                          <AnimatePresence>
                            {currentAnswer.option === 'Yes' && (
                              <motion.div
                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                className="overflow-hidden"
                              >
                                <label className="block text-sm font-medium text-falbor-elements-textSecondary mb-1">
                                  Your Email Address
                                </label>
                                <input
                                  type="email"
                                  placeholder="you@example.com"
                                  value={currentAnswer.text}
                                  onChange={(e) => updateAnswer('text', e.target.value)}
                                  className="w-full rounded-md border border-falbor-elements-borderColor bg-falbor-elements-background px-3 py-2 text-sm text-falbor-elements-textPrimary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple-500"
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                    </CardContent>

                    <CardFooter className="flex justify-between gap-3 pt-2 pb-6">
                      <Button
                        variant="ghost"
                        onClick={handleBack}
                        disabled={stepIndex === 0}
                        className={classNames(
                          "px-4 py-2 text-sm font-medium transition-colors",
                          stepIndex === 0 
                            ? "opacity-0 pointer-events-none" 
                            : "text-falbor-elements-textSecondary hover:bg-falbor-elements-background-depth-2 hover:text-falbor-elements-textPrimary"
                        )}
                      >
                        Back
                      </Button>
                      <Button
                        onClick={handleNext}
                        disabled={isNextDisabled()}
                        className={classNames(
                          "px-6 py-2 transition-all duration-200",
                          !isNextDisabled()
                            ? "bg-purple-500 hover:bg-purple-600 text-white shadow-sm"
                            : "bg-falbor-elements-background-depth-3 text-falbor-elements-textSecondary cursor-not-allowed"
                        )}
                      >
                        {isLastStep ? 'Submit Feedback' : 'Next'}
                      </Button>
                    </CardFooter>
                  </>
                )}
              </div>
            )}
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
