import React from 'react';
import { DemoArtifact } from './DemoArtifact';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content?: React.ReactNode | string;
  thought?: string;
  customUI?: React.ReactNode;
  contentAfterUI?: React.ReactNode;
}

export interface AgentFeature {
  id: string;
  title: string;
  description: string;
  imageSrc: string;
  buttonText: string;
  buttonLink: string;
  chatMessages: ChatMessage[];
}

export const agentFeaturesData: AgentFeature[] = [
  {
    id: 'cms-agent',
    title: 'Build an e-commerce platform that runs itself.',
    description: 'The user simply uploads a CSV of their products or drops in a link to their supplier. The AI automatically generates the database schema (products, variants, orders), builds a beautiful product gallery UI, and instantly populates the CMS with all the items, fully categorized with AI-generated descriptions.',
    imageSrc: '/landing/websites/web1.png',
    buttonText: 'Start with Agents ->',
    buttonLink: '/signup',
    chatMessages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'Build an e-commerce platform that runs itself.',
      },
      {
        id: 'msg-1-ai',
        role: 'assistant',
        content: 'I can help, but “an e-commerce platform that runs itself” is too broad to build responsibly as a first MVP. The key question is whether you mean automated operations for your own store or a platform that lets other merchants automate theirs.\n\nI’ve also started validation around autonomous commerce, focusing on merchant pain, existing automation tools, and where a narrowly scoped product could win.',
        customUI: (
          <DemoArtifact
            title="Autonomous E-commerce Validation"
            items={[
              {
                icon: 'i-ph:magnifying-glass-duotone',
                name: 'Market Research & Validation',
                status: '',
                type: 'complete',
                modalContent: (
                  <div>
                    1. Assumption Check & Problem Definition

                    The current assumption is that merchants want an e-commerce business that can operate with minimal human involvement. That is directionally plausible, but it combines several separate problems: product selection, supplier management, pricing, marketing, customer support, fulfillment, fraud, refunds, and compliance.

                    This may currently be a feature bundle rather than a sharply defined product. The strongest version of the problem is likely narrower: small merchants lose time maintaining catalogs, answering repetitive questions, and reacting to inventory or order events. Those tasks are frequent and automatable, while fully autonomous business operation still requires human approval because errors can create financial, legal, and reputational damage.

                    Critical assumptions to validate:

                    Merchants have enough repetitive operational work to pay for automation.
                    They will trust software to take actions rather than only make recommendations.
                    Existing platforms and integrations do not already solve the highest-value workflow.
                    Automated actions can be bounded by approval rules, budgets, and audit logs.
                    The first users can be reached through a focused merchant segment.

                    2. Market & Competitor Analysis

                    Shopify and Shopify Flow succeeded by becoming the system of record for merchants and adding workflow automation around existing events. The lesson is to integrate into the merchant’s current operations instead of asking them to rebuild their store.

                    Amazon and marketplace automation tools demonstrate demand for repricing, inventory, listing, and fulfillment automation. Their limitation is that automation is often fragmented across separate tools, marketplaces, and supplier systems. The opportunity is not “AI runs every store”; it is a reliable control layer for one painful workflow.

                    Gorgias, Zendesk, and Intercom show that customer support automation is commercially valuable when it is grounded in order data and has escalation paths. Purely generative support without transactional context creates trust and accuracy problems.

                    Klaviyo and marketing automation platforms prove merchants pay for event-driven campaigns, but setup complexity, segmentation quality, and maintaining campaigns remain common friction points.

                    Print-on-demand and dropshipping platforms reduce operational workload but often compete on commodity catalogs and thin margins. A new product would need a sharper advantage than simply connecting suppliers.

                    Why now: AI can interpret unstructured product and customer data more effectively than traditional rules engines, while commerce APIs make store, order, inventory, and support integrations more accessible. At the same time, rising acquisition costs and leaner merchant teams increase pressure to automate. However, AI reliability, fraud, returns, and platform policy constraints make “fully autonomous” positioning risky.
                    3. Evidence-Based Research

                    The market pattern is consistent: merchants adopt automation when it is tied to a measurable recurring task, such as recovering abandoned carts, categorizing support tickets, updating inventory, or generating product content.

                    A second pattern is that successful automation products preserve control. They use rules, approval thresholds, previews, rollback options, and logs. This suggests merchants are more likely to trust “autopilot with guardrails” than an opaque autonomous operator.

                    A third pattern is integration fatigue. Merchants already use storefront, payment, fulfillment, marketing, analytics, and support tools. A product that adds another disconnected dashboard may increase rather than reduce operational burden.

                    The evidence therefore supports workflow-specific automation, but does not yet support the assumption that merchants will delegate the entire business to an AI system.
                    4. Problem Validation Score

                    Weighted score: 5.8/10

                    Pain intensity — 7/10: Daily operational work is frustrating and costly, especially for small teams.
                    Frequency — 8/10: Catalog, order, inventory, customer, and marketing tasks recur constantly.
                    Existing alternatives — 4/10: Many individual solutions already exist, though they are fragmented.
                    Ability to reach users — 6/10: Shopify communities, agencies, merchant groups, and app marketplaces are reachable, but competitive.
                    Willingness to pay — 6/10: Merchants pay for clear revenue gains or labor savings; willingness falls sharply for vague “AI automation.”

                    The opportunity is real, but the broad concept scores only moderately because the problem is under-specified and existing alternatives are strong.
                    5. Why Would Someone Switch?

                    A merchant would switch only if the product reliably removes a workflow they currently operate across multiple tools, while producing measurable savings or revenue. A compelling reason could be: “Connect your existing store and supplier accounts; the system keeps product data, stock, pricing, and customer updates synchronized, with approvals for risky actions.”

                    There is currently no sufficient reason to switch for a generic promise that the entire store runs itself. That promise is difficult to trust, difficult to measure, and already partially addressed by existing platforms.
                    6. Founder Advantage

                    No founder-specific advantage has been provided. The strongest advantage would be intimate access to a narrow merchant segment, proprietary operational data, a supplier or agency network, or distribution through an existing commerce community.

                    Without access to first users, the idea faces a difficult discovery and trust problem. Commerce automation also benefits substantially from domain expertise because edge cases are financially consequential.
                    7. The First 10 Users

                    The first 10 users should be narrowly defined, for example:

                    Shopify merchants selling 20–100 repeat-purchase products.
                    Teams of one to three people.
                    At least 100 orders per month.
                    Using a separate supplier or fulfillment partner.
                    Spending several hours each week on inventory updates, product data cleanup, and repetitive order questions.
                    Already paying for at least two operational apps.
                    Active in Shopify community forums, niche merchant Slack groups, DTC operator communities, or ecommerce agency networks.

                    Their trigger event is usually a stock mismatch, supplier price change, product-data update, order-status question, or sudden support backlog.
                    8. Kill Criteria

                    The idea is probably not worth building if:

                    Ten narrowly targeted merchants say the workflow is annoying but not costly enough to solve.
                    Merchants already solve the selected workflow reliably with one inexpensive app.
                    Users refuse even low-risk automation after seeing a clear preview and rollback model.
                    Integrations cannot access the required store or supplier data.
                    The product cannot demonstrate measurable time savings or fewer costly errors within 30 days.
                    There is no low-cost distribution channel to reach merchants with the exact problem.

                    9. User Interview Plan

                    Talk to Shopify merchants matching the profile above, preferably owners or operators who personally handle orders and support.

                    Ask:

                    “Walk me through everything you did yesterday to keep orders, products, inventory, and customers moving.”
                    “Which task do you repeat most often, and how long does it take each week?”
                    “Tell me about the last time an inventory, supplier, or order-status mistake cost you time or money.”
                    “What tools or manual workarounds do you use today, and what remains unsolved?”
                    “What actions would you allow software to take automatically, and which would always require approval?”

                    Answers that validate the problem include recent concrete incidents, frequent manual work, current spending on partial solutions, and a willingness to run a constrained pilot using real data.

                    Answers that disprove the need include vague complaints without recent examples, low task frequency, no financial or time impact, satisfaction with existing automation, or refusal to test even reversible low-risk actions.
                    10. MVP Recommendation

                    Do not begin with a full autonomous commerce platform.

                    Run a concierge MVP for one workflow: automated catalog and inventory synchronization for a narrowly defined Shopify merchant segment. Initially, the service can monitor supplier or merchant data, identify changes, generate a proposed action plan, and execute only pre-approved low-risk updates.

                    The first product surface needs only:

                    Store connection.
                    A list of detected changes.
                    Proposed updates with before-and-after values.
                    Approval rules and thresholds.
                    Execution history and rollback information.
                    A simple weekly impact report.

                    Manually handle edge cases behind the scenes. This tests whether merchants trust the workflow and whether it produces measurable value before building a broad platform.
                    11. Final Decision

                    ⚠️ Validate first

                    There is genuine recurring pain and a plausible market, but the current idea is too broad and the switching reason is weak. Validate one high-frequency workflow with ten narrowly selected merchants before building an autonomous commerce platform.
                  </div>
                )
              }
            ]}
          />
        )
      },
      {
        id: 'msg-1-user2',
        role: 'user',
        content: 'Ok create the website.',
      },
      {
        id: 'msg-2',
        role: 'assistant',
        thought: 'I’ll build a focused autonomous-store MVP: a polished storefront plus an operations console that simulates the core self-running loop—catalog, orders, fulfillment status, and automated recommendations—without pretending that payments, shipping, or supplier integrations are live.',
        customUI: (
          <DemoArtifact
            title="Autonomous Store MVP"
            defaultOpen={false}
            items={[
              { icon: 'i-ph:file-code-duotone', name: 'package.json', status: 'Created', type: 'file' },
              { icon: 'i-ph:file-code-duotone', name: 'index.html', status: 'Created', type: 'file' },
              { icon: 'i-ph:file-code-duotone', name: 'src/main.jsx', status: 'Created', type: 'file' },
              { icon: 'i-ph:file-code-duotone', name: 'src/data/products.js', status: 'Created', type: 'file' },
              { icon: 'i-ph:file-code-duotone', name: 'src/components/Icon.jsx', status: 'Created', type: 'file' },
              { icon: 'i-ph:file-code-duotone', name: 'src/components/Sidebar.jsx', status: 'Created', type: 'file' },
              { icon: 'i-ph:file-code-duotone', name: 'src/components/MetricCard.jsx', status: 'Created', type: 'file' },
              { icon: 'i-ph:file-code-duotone', name: 'src/components/RevenueChart.jsx', status: 'Created', type: 'file' },
              { icon: 'i-ph:file-code-duotone', name: 'src/components/OrdersPanel.jsx', status: 'Created', type: 'file' },
              { icon: 'i-ph:file-code-duotone', name: 'src/components/ActivityPanel.jsx', status: 'Created', type: 'file' },
              { icon: 'i-ph:file-code-duotone', name: 'src/components/StorefrontPreview.jsx', status: 'Created', type: 'file' },
              { icon: 'i-ph:file-code-duotone', name: 'src/components/ProductsView.jsx', status: 'Created', type: 'file' },
              { icon: 'i-ph:file-code-duotone', name: 'src/components/OrdersView.jsx', status: 'Created', type: 'file' },
              { icon: 'i-ph:file-code-duotone', name: 'src/components/AutomationView.jsx', status: 'Created', type: 'file' },
              { icon: 'i-ph:file-code-duotone', name: 'src/components/DashboardView.jsx', status: 'Created', type: 'file' },
              { icon: 'i-ph:file-code-duotone', name: 'src/App.jsx', status: 'Created', type: 'file' },
              { icon: 'i-ph:file-css-duotone', name: 'src/styles/global.css', status: 'Created', type: 'file' },
              { icon: 'i-ph:terminal-window-duotone', name: 'npm install', status: 'Executed', type: 'shell' },
              { icon: 'i-ph:terminal-window-duotone', name: 'npm run dev', status: 'Executed', type: 'shell' }
            ]}
          />
        ),
        contentAfterUI: (
          <span>
            I published the site, this is the URL: <a href="https://falbor-diy-11b64d01-fa49-42f5-9558-5f242b047c06-1786933356872.netlify.app" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">https://falbor-diy-11b64d01-fa49-42f5-9558-5f242b047c06-1786933356872.netlify.app</a>
          </span>
        ),
      },
    ],
  },
  {
    id: 'db-agent',
    title: 'Launch a subscription business in minutes, not months.',
    description: 'The user types, "Build a SaaS dashboard with 3 pricing tiers and Stripe integration." The AI automatically creates the users, subscriptions, and payments tables, generates the responsive UI components for the pricing toggle and charts, and sets up row-level security so users only see their own data.',
    imageSrc: '/landing/websites/web2.png',
    buttonText: 'Start with Agents ->',
    buttonLink: '/signup',
    chatMessages: [
      {
        id: 'msg-3',
        role: 'user',
        content: 'Build a complex B2B dashboard with user authentication, billing tiers, and data visualization.',
      },
      {
        id: 'msg-3-ai',
        role: 'assistant',
        content: 'I can build this, but it’s too broad to validate responsibly as a first MVP. I’ve mapped the riskiest assumptions, relevant dashboard patterns, and a smallest testable scope below. Once you choose the target user and primary workflow, I can create the first working dashboard slice rather than an expensive generic admin panel.',
        customUI: (
          <DemoArtifact
            title="B2B Dashboard Validation & MVP Definition"
            items={[
              {
                icon: 'i-ph:magnifying-glass-duotone',
                name: 'Schema Research & Validation',
                status: '',
                type: 'complete',
                modalContent: (
                  <div>
                    1. Assumption Check & Problem Definition

                    The current concept is a platform category, not yet a sharply defined product: “a complex B2B dashboard with authentication, billing tiers, and data visualization.” Authentication, subscriptions, and charts are implementation features; they do not establish a painful customer problem.

                    The core assumption is that a specific business user needs a single workspace to understand operational or financial data and take action. This needs validation because many dashboards become reporting layers that users visit infrequently, while the actual workflow remains in spreadsheets, CRM tools, billing portals, or BI products.

                    For this to work, several assumptions must be true:

                    There is a recurring business decision that users cannot make quickly with their current tools.
                    The required data can be accessed reliably and with acceptable setup effort.
                    The dashboard produces an action or measurable outcome, not just attractive charts.
                    A buyer exists who controls budget and can justify recurring software spend.
                    Different billing tiers map to meaningful differences in value, usage, governance, or scale.
                    Users trust the calculations enough to use the product in operational or financial decisions.

                    At this stage, the problem is not sufficiently defined to justify building a complex product.
                    2. Market & Competitor Analysis

                    Metabase, Looker Studio, Power BI, and Tableau succeed because they provide flexible reporting and connect to existing data sources. Their lesson is that distribution through existing company data and familiar workflows matters more than visual novelty. Their common limitations are setup complexity, governance overhead, inconsistent metric definitions, and dashboards that show information without prescribing next steps. A new product should avoid competing on “more charts” and instead own one decision workflow.

                    Stripe Billing, Chargebee, and Paddle succeed because they handle infrastructure-heavy subscription and payment operations that businesses cannot safely improvise. Their lesson is that billing is valuable when it is the product’s operational core. Adding billing tiers to an unrelated dashboard does not create differentiation. Their limitations include complexity for smaller teams and the need to reconcile billing data with product usage, finance, and customer success workflows.

                    HubSpot, Salesforce, and customer-success platforms such as Gainsight succeed by combining data with a workflow: follow up with a lead, renew an account, resolve an issue, or improve adoption. This suggests the strongest opportunity is a vertical dashboard that turns a narrow set of business signals into prioritized actions.

                    Why now: Companies are under pressure to prove software ROI, control recurring spend, and make decisions with fragmented data. AI-assisted analytics and increasingly accessible APIs make specialized operational views easier to build, but they also increase the risk of producing generic dashboards that established BI products can replicate.

                    The opportunity is real only if the dashboard is tied to a high-frequency, high-cost decision and can reach users through a focused niche.
                    3. Evidence-Based Research

                    The strongest observable market pattern is segmentation: broad BI tools win on flexibility, while focused SaaS products win when they package domain-specific metrics, permissions, alerts, and actions.

                    A second pattern is that dashboard users commonly struggle with data trust and maintenance rather than chart creation. Metric definitions, stale integrations, missing ownership, and unclear thresholds reduce adoption. This means a useful MVP should test data freshness, a small number of trusted metrics, and a clear action loop.

                    A third pattern is that billing is usually either:

                    an internal SaaS capability that supports the product’s own monetization, or
                    a customer-facing finance workflow where billing itself is the painful problem.

                    Treating billing merely as a settings page is unlikely to validate product demand.

                    The current evidence supports building a narrowly focused decision product, not a general-purpose complex dashboard.
                    4. Problem Validation Score

                    Provisional score: 4.6/10

                    Pain Intensity — 5/10: Business reporting can be painful, but the described problem does not identify a costly failure.
                    Frequency — 6/10: Many teams review metrics weekly or daily, but frequency depends entirely on the chosen workflow.
                    Existing Alternatives — 3/10: Existing BI, CRM, spreadsheets, and analytics tools are plentiful and often “good enough.”
                    Ability to Reach Users — 5/10: A narrow vertical may be reachable through communities and professional networks; a general B2B audience is difficult.
                    Willingness To Pay — 4/10: Buyers pay for outcomes, automation, governance, or revenue protection—not for a dashboard in isolation.

                    Weighted conclusion: the market is large, but the current problem definition is weak. The score should increase only after identifying a concrete trigger event and measurable business outcome.
                    5. Why Would Someone Switch?

                    A user already using spreadsheets, BI tools, or a CRM would switch only if this product:

                    eliminates recurring manual reconciliation,
                    identifies a problem earlier than their current workflow,
                    embeds the exact action they need to take,
                    provides trusted domain-specific metrics their existing tools do not provide,
                    or proves a measurable financial or operational improvement.

                    “More beautiful charts,” “all data in one place,” and “modern authentication and billing” are not sufficient switching reasons. Without a specific advantage, there is currently no strong reason to switch.
                    6. Founder Advantage

                    No founder advantage has been provided. The key questions are:

                    Does the builder work in a specific industry with repeated exposure to this reporting problem?
                    Can they access 10–20 target users immediately?
                    Do they possess proprietary data, integrations, distribution, or domain expertise?
                    Can they manually deliver the desired insight before automating it?

                    If the answer to all of these is no, the product will face both a discovery problem and a distribution problem.
                    7. The First 10 Users

                    Do not start with “B2B companies.” Pick one exact group. Examples of viable starting cohorts include:

                    Ten SaaS customer-success managers at companies with 50–500 customers who manually combine product usage, support tickets, and renewal dates every week.
                    Ten agency finance leads who reconcile subscription invoices, project margins, and client profitability in spreadsheets.
                    Ten operations managers at multi-location businesses who receive daily exports from separate scheduling, sales, and staffing systems.
                    Ten startup founders responsible for monitoring cloud spend and usage-based gross margins before monthly finance reviews.

                    They likely gather in specialized Slack groups, LinkedIn communities, industry meetups, Reddit communities, and vendor-specific customer groups. The trigger event is a recurring report, renewal review, budget meeting, anomaly, or executive request that forces manual reconciliation.
                    8. Kill Criteria

                    The idea is probably not worth building if:

                    Interviews with 10 narrowly defined users show that the reporting task takes less than 30 minutes or causes little concern.
                    Users already get the required answer reliably from an existing BI tool or spreadsheet.
                    No user can name a decision they would change based on the dashboard.
                    Data access requires integrations that cannot be obtained without lengthy enterprise sales cycles.
                    Users will not share sample data or participate in a manual pilot.
                    The buyer cannot identify a budget owner or measurable return.
                    Billing tiers are based only on arbitrary feature gating rather than value, volume, governance, or usage.

                    9. User Interview Plan

                    Talk to one narrow cohort, such as SaaS customer-success managers responsible for renewals.

                    Ask:

                    “Tell me about the last time you prepared a renewal or account-health review. What did you do step by step?”
                    “Which systems or exports did you combine, and how long did the process take?”
                    “What decision or action resulted from that review?”
                    “What was the most recent time you discovered a risk too late?”
                    “What have you tried to automate, and why did it not stick?”

                    Answers that validate the problem:

                    The task happens weekly or more often.
                    It requires multiple sources and repeated manual work.
                    A missed signal causes churn, wasted staff time, or executive escalation.
                    The user already spends money or significant time trying to solve it.
                    They volunteer sample data, introductions, or a willingness to test a manual service.

                    Answers that disprove the need:

                    The task is rare, low consequence, or already automated.
                    Users cannot identify a decision affected by the data.
                    They prefer existing tools and describe no meaningful limitation.
                    They refuse to provide examples because the pain is not important.
                    The proposed dashboard would require more maintenance than the current process.

                    10. MVP Recommendation

                    Do not build the full complex dashboard yet. Run a concierge MVP for one narrow workflow:

                    Choose one user segment and one recurring decision.
                    Collect a sample of their current exports or screenshots.
                    Manually produce a weekly “priority actions” report with 3–5 trusted metrics.
                    Deliver it through email, a shared document, or a very small read-only web view.
                    Measure time saved, actions taken, repeat usage, and willingness to pay.

                    After users repeatedly use the report and confirm value, build only the product slice required to automate data ingestion, the core metrics, the action queue, and a minimal organization/member model. Authentication and billing should then support the validated workflow, not precede it.
                    11. Final Decision

                    ⚠️ Validate first

                    The category is crowded and the current request describes infrastructure and presentation rather than a specific customer pain. A focused concierge test can quickly reveal whether there is a valuable workflow; only after that evidence should the complex authenticated, paid dashboard be built.
                  </div>
                )
              }
            ]}
          />
        )
      },
      {
        id: 'msg-3-user2',
        role: 'user',
        content: 'Just build the MVP without info its just for testing',
      },
      {
        id: 'msg-4',
        role: 'assistant',
        thought: 'I’ll build a self-contained test MVP centered on one useful workflow: sign in, review business KPIs, inspect trends, manage a simple plan, and view recent activity. It will use local demo authentication and mock data so it works immediately without a backend; production authentication, billing, and Supabase can be connected later.',
        customUI: (
          <DemoArtifact
            title="Creating Database Schema"
            defaultOpen={false}
            items={[
              { icon: 'i-ph:table-duotone', name: 'users table', status: 'Created', type: 'file' },
              { icon: 'i-ph:table-duotone', name: 'posts table', status: 'Created', type: 'file' }
            ]}
          />
        ),
        contentAfterUI: (
          <span>
            I published the site, this is the URL: <a href="https://falbor-diy-0503ad99-e577-4f1b-bb45-26b43f4ac306-1786935648513.netlify.app/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">https://falbor-diy-0503ad99-e577-4f1b-bb45-26b43f4ac306-1786935648513.netlify.app</a>
          </span>
        ),
      },
    ],
  },
  {
    id: 'ui-agent',
    title: 'powerful directories powered by intelligent search.',
    description: 'The user asks the AI to "Create a real estate directory with advanced filtering." The AI sets up the database for properties and agents, builds a complex search UI (with sliders for price and dropdowns for location), and connects a CMS where the agent automatically formats and approves incoming property submissions from users.',
    imageSrc: '/landing/websites/web3.png',
    buttonText: 'Start with Agents ->',
    buttonLink: '/signup',
    chatMessages: [
      {
        id: 'msg-5',
        role: 'user',
        content: 'Create powerful directories powered by intelligent search.',
      },
      {
        id: 'msg-5-ai',
        role: 'assistant',
        content: 'I’ll treat this as a new product idea and first pressure-test the positioning before building. The key question is whether “intelligent search” solves a painful directory problem for a narrowly defined audience, rather than becoming a generic directory feature.',
        customUI: (
          <DemoArtifact
            title="Intelligent Directory Market Validation"
            items={[
              {
                icon: 'i-ph:magnifying-glass-duotone',
                name: 'Design Research & Validation',
                status: '',
                type: 'complete',
                modalContent: (
                  <div>
                    1. Assumption Check & Problem Definition

                    The current idea—“powerful directories powered by intelligent search”—is a product direction, not yet a sufficiently defined problem. It assumes that people struggle to discover, compare, and trust entries in existing directories, and that natural-language search can solve this better than filters, categories, or general-purpose search engines.

                    The strongest version of the problem is likely:

                    A specific audience needs to find a qualified option matching several constraints, but existing directories force them to browse, use brittle filters, or manually verify information across multiple sources.

                    This could be a must-have problem when the decision is high-stakes, time-sensitive, or difficult to evaluate—such as finding healthcare providers, local services, software vendors, grants, jobs, suppliers, or specialized professionals. It is only a nice-to-have if the directory is merely a more conversational interface over a small, already searchable list.

                    The assumptions that must be true:

                    Users frequently need to search across multiple criteria expressed in natural language.
                    Existing directory search and filtering are materially frustrating or insufficient.
                    Directory data is accurate, structured, fresh, and deep enough for intelligent matching.
                    Search results can be explained and trusted, not just ranked mysteriously.
                    There is a focused audience with a reachable distribution channel.
                    The directory has a defensible data or community advantage.
                    Users will return often enough—or the decision value will be high enough—to support the business.

                    2. Market & Competitor Analysis
                    Google Search, Maps, and general search engines

                    These products succeed because they have enormous coverage, strong distribution, mature ranking systems, and abundant behavioral data. Users already start many discovery tasks there.

                    Lesson: a new directory cannot win by being “search, but with AI.” It needs a constrained corpus, better structured attributes, clearer comparison, and a result quality advantage for one specific job.

                    Limitation: broad search often produces SEO pages, sponsored results, incomplete information, and inconsistent data. Maps is strong for location and reviews but weaker for nuanced constraints, specialized categories, and transparent qualification.
                    Yelp, TripAdvisor, Zillow, G2, Capterra, and vertical directories

                    These services succeed by owning a valuable decision category and accumulating reviews, listings, taxonomy, and user intent around it.

                    Lesson: category focus and proprietary data matter more than the interface. Their best features are not simply filters; they are trust signals, structured comparison, reviews, availability, pricing, and workflow support.

                    Limitations users commonly encounter include outdated listings, incentivized or low-quality reviews, paid placement, repetitive SEO content, missing pricing, and filters that do not capture real-world preferences.
                    ChatGPT, Perplexity, and AI answer engines

                    These products have trained users to ask questions conversationally and expect synthesized answers. They validate demand for natural-language discovery.

                    Lesson: intelligent search is now an expected interaction pattern, but a directory must provide better source grounding, current records, structured facts, and an actionable path after discovery.

                    Limitation: general AI tools may hallucinate, cite stale information, omit important options, and lack a reliable domain-specific inventory.
                    Niche databases and community-curated directories

                    Examples include industry association lists, curated startup directories, local newsletters, specialist communities, and public databases.

                    Lesson: the initial competitive advantage may come from curation and trusted expertise rather than technology. A small, high-quality directory with a clearly defined audience can outperform a broad directory with weak data.
                    Why now?

                    Natural-language interfaces have lowered the education barrier for intelligent search. At the same time, users face information overload, fragmented data, and increasing skepticism toward SEO-heavy results. The opportunity is timely if the product applies AI to a high-intent, data-rich niche where trust and fit matter more than raw web coverage.
                    3. Evidence-Based Research

                    The strongest market pattern is not that users want “AI directories.” It is that users increasingly expect to describe goals and constraints in their own words rather than learn a directory’s taxonomy.

                    Evidence patterns to validate:

                    Search behavior is moving toward longer, more specific queries.
                    Users complain when directory listings are stale, incomplete, or dominated by paid placement.
                    General AI answers create demand for synthesis but also expose trust and freshness problems.
                    Successful directories concentrate on a decision category with repeatable attributes and strong intent.
                    Users are more likely to tolerate a new product when the cost of a wrong result is high and current alternatives require manual comparison.

                    What is not yet proven is whether users will adopt a standalone intelligent directory instead of using Google, an AI assistant, an existing vertical marketplace, or a trusted community recommendation. That switching behavior must be tested directly.
                    4. Problem Validation Score

                    Pre-validation weighted score: 5.4/10

                    Pain intensity — 6/10: Potentially high for complex or consequential decisions, but low for casual discovery.
                    Frequency — 5/10: Depends entirely on the chosen category. Some directories have recurring use; others are one-time decisions.
                    Existing alternatives — 4/10: Google, Maps, marketplaces, specialist databases, and AI assistants already cover much of the job.
                    Ability to reach users — 6/10: Possible through focused communities, associations, newsletters, and SEO, but broad acquisition would be difficult.
                    Willingness to pay — 5/10: Buyers may pay for qualified leads, workflow, or professional data; consumers may not pay for search alone.

                    The score is held back because the product is currently defined by a technology—intelligent search—rather than a narrow, urgent use case.
                    5. Why Would Someone Switch?

                    A user would switch only if the directory consistently produces a short list that is more relevant, more trustworthy, and faster to act on than their current workflow.

                    A strong switching argument could be:

                    “Describe the exact option you need, and receive five current, explainable matches with verified attributes, tradeoffs, and a direct next step.”

                    A weak switching argument would be:

                    “Search our directory using AI.”

                    There is currently no sufficient reason to switch until the category, data advantage, and measurable result-quality improvement are specified.
                    6. Founder Advantage

                    No founder advantage is provided yet. This is a significant unknown.

                    The strongest advantages would be:

                    Deep access to a specific professional or local community.
                    Firsthand knowledge of the decision workflow and its hidden constraints.
                    Exclusive or difficult-to-collect listing data.
                    An existing audience, newsletter, marketplace, or industry relationship.
                    Ability to manually verify the first several hundred records.

                    Without one of these advantages, the product risks becoming an interface layer that larger search and AI platforms can copy.
                    7. The First 10 Users

                    Do not start with “people who search directories.” Choose one concrete segment. Potential examples for validation—not a final recommendation—include:

                    Ten operations managers at 20–100-person companies who repeatedly need to find specialized vendors with compliance requirements.
                    Ten parents in one metropolitan area searching for after-school programs with specific schedules, accessibility needs, and pricing limits.
                    Ten founders in a single accelerator network looking for grants, investors, or service providers matching stage and geography.
                    Ten independent professionals who need verified subcontractors for recurring project work.

                    They likely hang out in focused Slack groups, local or professional Facebook groups, Reddit communities, association directories, newsletters, and niche events.

                    The trigger event is the moment they receive a request or face a deadline with several constraints and discover that existing search results require manual vetting.
                    8. Kill Criteria

                    The idea is probably not worth building if:

                    Ten interviews reveal that users already find suitable options quickly through Google, referrals, or an existing vertical directory.
                    Users value personal recommendations more than searchable inventory.
                    Search quality is not meaningfully better when using natural-language input.
                    Directory data cannot be kept current without unsustainable manual work.
                    Users do not trust AI-generated matches for the decision.
                    Listing owners will not provide data, pay for qualified leads, or participate in verification.
                    There is no focused, zero-cost path to the first 100 users.
                    The product cannot identify a category where a wrong result has meaningful cost.

                    9. User Interview Plan

                    Talk to people who recently had to make the target decision, not people who merely say the idea sounds useful.

                    Ask:

                    “Tell me about the last time you needed to find one of these options. What triggered the search?”
                    “What exact constraints or requirements did you have?”
                    “Where did you search, and what did you do after finding the first results?”
                    “Which part was slow, unreliable, or frustrating?”
                    “What would have made you trust and act on a recommended shortlist?”

                    Answers that prove the problem is real:

                    They describe a recent, repeated task.
                    They used multiple sources or spreadsheets to compare options.
                    They rejected many results because important attributes were missing or inaccurate.
                    The decision had a deadline, financial cost, compliance risk, or personal consequence.
                    They can name a current workaround and its concrete shortcomings.

                    Answers that prove the product is not needed:

                    They mostly rely on one trusted referral source.
                    Searches are rare and take only a few minutes.
                    They do not need multiple constraints.
                    They would not trust an AI shortlist without manually repeating the research.
                    The current pain is poor supply or unavailable providers, not discovery.

                    10. MVP Recommendation

                    Do not code a broad directory yet.

                    Run a concierge MVP for one narrow category:

                    Select one audience and one high-intent search job.
                    Manually assemble a trusted dataset of 50–100 entries.
                    Ask users to submit their request in natural language.
                    Return a curated shortlist with explicit match reasons, missing information, tradeoffs, and links.
                    Track time to useful result, shortlist acceptance, click-through, follow-up actions, and repeat requests.
                    Compare the manual intelligent-search experience with the user’s normal workflow.

                    A simple landing page can recruit participants, but the core experiment should test whether better matching and explanation produce real behavior—not merely positive feedback.

                    Only build the search interface after at least five users complete the concierge workflow and several say they would use it again or pay for access, qualified leads, or workflow support.
                    11. Final Decision

                    ⚠️ Validate first

                    The concept has credible timing and broad applicability, but it is not yet a product thesis. The main risk is building a generic AI layer over a directory without a focused pain point, proprietary data, or a compelling reason to switch. Start with one narrow, high-intent category and prove that a trusted shortlist saves users meaningful time or prevents costly mistakes.
                  </div>
                )
              }
            ]}
          />
        )
      },
      {
        id: 'msg-5-user2',
        role: 'user',
        content: 'Ok create the website is just for testing',
      },
      {
        id: 'msg-6',
        role: 'assistant',
        thought: 'I’m creating the concierge MVP directly in the workspace with local mock data, an end-user directory, a match request flow, and an operator queue. I’ll install dependencies, start the app, and run a verification scan before finishing.',
        customUI: (
          <DemoArtifact
            title="Intelligent Directory MVP"
            defaultOpen={false}
            items={[
              { icon: 'i-ph:file-code-duotone', name: 'package.json', status: 'Added', type: 'file' },
              { icon: 'i-ph:file-code-duotone', name: 'index.html', status: 'Added', type: 'file' },
              { icon: 'i-ph:file-code-duotone', name: 'vite.config.js', status: 'Added', type: 'file' },
              { icon: 'i-ph:file-code-duotone', name: 'src/main.jsx', status: 'Added', type: 'file' },
              { icon: 'i-ph:file-code-duotone', name: 'src/data/listings.js', status: 'Added', type: 'file' },
              { icon: 'i-ph:file-code-duotone', name: 'src/components/Icon.jsx', status: 'Added', type: 'file' },
              { icon: 'i-ph:file-code-duotone', name: 'src/components/Header.jsx', status: 'Added', type: 'file' },
              { icon: 'i-ph:file-code-duotone', name: 'src/components/Hero.jsx', status: 'Added', type: 'file' },
              { icon: 'i-ph:file-code-duotone', name: 'src/components/ListingCard.jsx', status: 'Added', type: 'file' },
              { icon: 'i-ph:file-code-duotone', name: 'src/components/DetailModal.jsx', status: 'Added', type: 'file' },
              { icon: 'i-ph:file-code-duotone', name: 'src/components/AddPlaceModal.jsx', status: 'Added', type: 'file' },
              { icon: 'i-ph:file-code-duotone', name: 'src/components/Discovery.jsx', status: 'Added', type: 'file' },
              { icon: 'i-ph:file-code-duotone', name: 'src/components/HowItWorks.jsx', status: 'Added', type: 'file' },
              { icon: 'i-ph:file-code-duotone', name: 'src/App.jsx', status: 'Added', type: 'file' },
              { icon: 'i-ph:file-code-duotone', name: 'src/styles/global.css', status: 'Added', type: 'file' },
            ]}
          />
        ),
        contentAfterUI: (
          <span>
            I published the site, this is the URL: <a href="https://falbor-diy-ec5f205c-4ce4-420a-b126-1a9014f8df4b-1786938304753.netlify.app/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">https://falbor-diy-ec5f205c-4ce4-420a-b126-1a9014f8df4b-1786938304753.netlify.app</a>
          </span>
        ),
      },
    ],
  }
];