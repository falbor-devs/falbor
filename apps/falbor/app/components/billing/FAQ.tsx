import React from 'react';

const FAQItem = ({ question, answer, isActive, onToggle, index, faqsLength }: { question: string, answer: string, isActive: boolean, onToggle: () => void, index: number, faqsLength: number }) => {
    return (
        <div className={`px-4 py-2 ${index === faqsLength - 1 ? 'border-none' : 'border-b border-zinc-200 dark:border-zinc-800'}`}>
            <button
                onClick={onToggle}
                className="flex justify-between items-center w-full py-4 text-left group"
            >
                <span className="text-sm font-medium text-zinc-900 dark:text-white group-hover:text-[#0099ff] transition-colors">
                    {question}
                </span>
                <span className="flex-shrink-0 h-5 w-5 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 group-hover:text-[#0099ff] hover:bg-[#0099ff]/0 transition-all">
                    {isActive ? '−' : '+'}
                </span>
            </button>
            {isActive && (
                <div className="pb-4">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        {answer}
                    </p>
                </div>
            )}
        </div>
    );
};

const FAQSection = () => {
    const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

    const faqs = [
        {
            question: "What is Falbor?",
            answer: "Falbor is an AI-powered platform that helps you automate your marketing. It allows you to create custom agents that can perform tasks such as sending emails, managing your calendar, and much more. It is a powerful tool that can save you time and help you be more productive."
        },
        {
            question: "Can I cancel my subscription anytime?",
            answer: "Yes! You can cancel your auto-renewal at any time. Subscriptions are non-refundable, but once canceled, you will not be charged for the following month and you will maintain full access to all plan features and remaining credits until the current billing cycle expires."
        },
        {
            question: "Do my unused credits roll over to the next month?",
            answer: "No, credits reset at the start of each billing cycle. Each month you receive your plan's full allowance (e.g. 150 credits for Pro, 500 for Power, 1,500 for Business), but unused credits do not roll over into the following month."
        },
        {
            question: "How much does it cost to send a message?",
            answer: "The cost varies depending on the model you use. Simpler models are cheaper, while more advanced ones cost more. You can see the exact credit cost in the sidebar before sending."
        },
        {
            question: "What happens if I run out of credits?",
            answer: "If you run out of credits, your agents will pause until your next billing cycle or until you purchase additional credits. You can top up your credits anytime."
        }
    ];

    const toggleFAQ = (index: number) => {
        setActiveIndex(activeIndex === index ? null : index);
    };

    return (
        <div className="">
            <h2 className="text-xl font-semibold mb-6 text-zinc-900 dark:text-white">Frequently Asked Questions</h2>
            <div className="bg-white dark:bg-zinc-950 rounded-md border border-gray-300 dark:border-zinc-800 overflow-hidden">
                {faqs.map((faq, index) => (
                    <FAQItem
                        key={index}
                        question={faq.question}
                        answer={faq.answer}
                        faqsLength={faqs.length}
                        index={index}
                        isActive={activeIndex === index}
                        onToggle={() => toggleFAQ(index)}
                    />
                ))}
            </div>
        </div>
    );
};
export default FAQSection;