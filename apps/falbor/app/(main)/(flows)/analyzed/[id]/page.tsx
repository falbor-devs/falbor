import { notFound, redirect } from "next/navigation";
import { db } from "~/lib/db";
import { analyzedReports } from "~/lib/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "~/lib/auth";
import ReactMarkdown from 'react-markdown';

interface PageProps {
  params: { id: string };
}

export default async function AnalyzedValidationPage({ params }: PageProps) {
  const { id } = params;

  const records = await db.select().from(analyzedReports).where(eq(analyzedReports.id, id));

  if (records.length === 0) {
    notFound();
  }

  const report = records[0];

  
  if (!report.isPublic) {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    let userId = null;
    if (token) {
      const payload = await verifyToken(token);
      userId = payload?.userId;
    }

    if (!userId || userId !== report.userId) {
      redirect("/unauthorized"); 
    }
  }

  return (
    <div className="min-h-screen bg-falbor-elements-background-depth-1 flex items-start justify-center p-4 sm:p-8 overflow-y-auto">
      <div className="max-w-4xl w-full bg-falbor-elements-background-depth-2 rounded-lg">
        <div className="p-8 md:p-12 flex flex-col gap-6">
          <ReactMarkdown
            className="flex flex-col gap-6"
            components={{
              h2: ({ node, ...props }) => (
                <h2 className="text-2xl font-semibold text-falbor-elements-textPrimary mt-8 mb-4 pb-2 border-b border-falbor-elements-borderColor flex items-center gap-2" {...props} />
              ),
              h3: ({ node, ...props }) => (
                <h3 className="text-xl font-medium text-falbor-elements-textPrimary mt-6 mb-3" {...props} />
              ),
              p: ({ node, ...props }) => (
                <p className="text-base text-falbor-elements-textSecondary leading-relaxed m-0" {...props} />
              ),
              ul: ({ node, ...props }) => (
                <ul className="flex flex-col gap-3 my-2" {...props} />
              ),
              li: ({ node, ...props }) => (
                <li className="flex gap-2 text-base text-falbor-elements-textSecondary leading-relaxed items-start before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-falbor-elements-item-contentAccent before:mt-2.5 before:shrink-0" {...props} />
              ),
              strong: ({ node, ...props }) => (
                <strong className="font-semibold text-falbor-elements-textPrimary bg-falbor-elements-background-depth-3 px-1.5 py-0.5 rounded text-sm mx-0.5 shadow-sm border border-falbor-elements-borderColor/50" {...props} />
              ),
              a: ({ node, ...props }) => (
                <a className="inline-flex items-center gap-1 px-4 py-2 mt-2 bg-falbor-elements-item-backgroundAccent text-falbor-elements-item-contentAccent rounded-lg hover:opacity-90 transition-opacity font-medium text-sm no-underline shadow-sm" target="_blank" rel="noopener noreferrer" {...props} />
              ),
              blockquote: ({ node, ...props }) => (
                <blockquote className="border-l-4 border-falbor-elements-item-contentAccent pl-5 py-3 italic bg-falbor-elements-background-depth-2 rounded-r-lg my-4 text-falbor-elements-textSecondary" {...props} />
              ),
            }}
          >
            {report.rawAnalysis || "No analysis data available."}
          </ReactMarkdown>


        </div>
      </div>
    </div>
  );
}
