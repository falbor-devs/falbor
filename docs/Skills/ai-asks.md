# AI Asks

**Description:**
This skill instructs the AI to evaluate a product's user interface and point out important elements or information that a user might easily overlook due to poor placement, low contrast, or confusing navigation. The AI must launch a browser to evaluate the site.

**Execution Context:**
- The AI must launch the browser using its available browser tools.
- It will navigate to the target site and analyze the user journey and visual hierarchy.

**Evaluation Criteria:**
- **Hidden CTAs:** Are primary actions buried below the fold or hidden in non-obvious menus?
- **Missed Trust Signals:** Are testimonials, security badges, or social proof hard to find?
- **Unclear Navigation:** Are critical pages (like Pricing, Contact, or About) missing from the main header or footer?
- **Accessibility Issues:** Is important text too small or low-contrast to read easily?
- **Dead Ends:** Does the user hit pages with no clear next action?

**Output:**
Provide a list of "overlooked elements." For each element, explain *why* it is important, *why* a user might miss it, and suggest a concrete design change to make it more prominent.
