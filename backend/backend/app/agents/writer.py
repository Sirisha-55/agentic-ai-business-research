from app.llm import generate_response
import re


# =========================================================
# MARKDOWN CLEANUP
# =========================================================
# Gemini can sometimes escape Markdown characters.
# This function converts escaped Markdown back to normal Markdown.
# =========================================================

def clean_report_markdown(report: str) -> str:
    cleaned = report.strip()

    # Remove unnecessary escaping before Markdown punctuation.
    cleaned = re.sub(r'\\([#*_+\-.,:;()\[\]{}~!|])', r'\1', cleaned)

    # Fix escaped URL separators.
    cleaned = cleaned.replace(r"\://", "://")
    cleaned = cleaned.replace(r"\/", "/")

    # Remove duplicated backslashes.
    cleaned = cleaned.replace("\\\\", "\\")

    # Remove accidental spaces before punctuation.
    cleaned = re.sub(r"[ \t]+([,.;:])", r"\1", cleaned)

    return cleaned.strip()


# =========================================================
# WRITER AGENT
# =========================================================

def writer_agent(
    user_query: str,
    analysis: str,
    market_research: list[dict],
    company_research: list[dict],
    competitor_research: list[dict],
    previous_draft: str = "",
    review_feedback: str = "",
) -> str:

    # =====================================================
    # FIRST REPORT
    # =====================================================

    if not previous_draft:

        prompt = f"""
You are a Senior Business Research Analyst.

Create a professional, concise, evidence-based business research
report that directly answers the user's question.

The report must be useful to a business analyst.
Do not write a generic industry essay.

=========================================================
USER QUESTION
=========================================================

{user_query}

=========================================================
ANALYSIS
=========================================================

{analysis}

=========================================================
MARKET RESEARCH
=========================================================

{market_research}

=========================================================
COMPANY RESEARCH
=========================================================

{company_research}

=========================================================
COMPETITOR RESEARCH
=========================================================

{competitor_research}

=========================================================
CORE RULES
=========================================================

1. USE ONLY SUPPLIED EVIDENCE

Use information from:
- Analysis
- Market Research
- Company Research
- Competitor Research

Do not add facts from your own knowledge.

If important information is missing, say:
"Not found in the available research."

---------------------------------------------------------

2. ANSWER THE EXACT QUESTION

Every section must help answer the user's question.

Do not add unrelated industry information just to make
the report longer.

---------------------------------------------------------

3. AVOID REPETITION

This is extremely important.

Do NOT repeat the same:
- market share
- revenue
- sales
- market size
- growth rate
- company fact
- competitor fact
- conclusion

across multiple sections.

A statistic should normally appear ONCE.

Use later sections to explain what that statistic means
instead of repeating the number.

---------------------------------------------------------

4. CANONICAL FACT RULE

For important quantitative information:

Market figures → Market Overview

Company figures → Company / Competitive Landscape

Comparison figures → Competitive Landscape table

Do not repeat the same figures in Executive Brief,
Competitive Positioning, Strategic Insights and Conclusion.

---------------------------------------------------------

5. FAIR COMPANY COMPARISON

Compare companies using compatible:
- metrics
- periods
- product categories

Do not compare unrelated metrics.

If comparable evidence is unavailable, explicitly state that.

---------------------------------------------------------

6. COMPETITOR CLASSIFICATION

Clearly separate:

Direct competitors:
Companies serving substantially overlapping customers
and product categories.

Indirect / adjacent competitors:
Companies affecting the same customer need or ecosystem
without directly overlapping.

Emerging competitors:
New or expanding players becoming relevant.

Do not call every company in the industry a direct competitor.

---------------------------------------------------------

7. FACT VS ANALYSIS

Clearly distinguish:

FACT:
Directly supported by evidence.

OBSERVATION:
Pattern visible across evidence.

ANALYSIS:
Reasoned interpretation.

BUSINESS IMPLICATION:
Why the finding matters.

Do not present assumptions as facts.

---------------------------------------------------------

8. TIME PERIODS

Preserve the original:
- year
- month
- quarter
- financial year
- calendar year

Do not combine incompatible periods.

---------------------------------------------------------

9. NO INVENTED INFORMATION

Never invent:
- statistics
- market shares
- prices
- revenues
- company facts
- customer demographics
- URLs
- partnerships
- product information

---------------------------------------------------------

10. SOURCES

Use only sources contained in the supplied research.

Do not create fake URLs.

=========================================================
REPORT LENGTH
=========================================================

Keep the report concise.

Target approximately 900–1400 words for a normal research question.

Use more only when the evidence genuinely requires it.

Do not increase length by repeating information.

=========================================================
REPORT STRUCTURE
=========================================================

# Executive Brief

Give the direct answer to the user's question.

Include only:
- main answer
- 3–4 key findings
- one important business implication

Keep this section short.

Do not repeat detailed statistics that will appear later.

---------------------------------------------------------

# 1. Market Overview

Explain the market situation relevant to the question.

Include only important evidence such as:
- market size
- growth
- adoption
- demand
- important segments
- major market trends

Use a table when useful:

| Metric | Finding | Period |
|---|---|---|

This is the PRIMARY section for market statistics.

---------------------------------------------------------

# 2. Market Drivers and Customer Demand

Explain:

- major demand drivers
- customer needs
- buying factors
- adoption barriers
- important customer trends
- infrastructure or pricing factors

For each important point:

Evidence → What is changing → Business implication

Do not repeat market statistics already given above.

---------------------------------------------------------

# 3. Company and Competitive Landscape

Focus on the companies directly relevant to the question.

For each major company, briefly describe:
- products / services
- target segment
- market position
- relevant differentiation
- important recent development

Then classify competitors as:

### Direct Competitors

### Indirect / Adjacent Competitors

### Emerging Competitors

Keep this section focused.

Do not create long company profiles unless the user specifically asks
for detailed company analysis.

---------------------------------------------------------

# 4. Competitive Comparison

Use a concise table when comparable evidence exists.

| Company | Key Products | Target Segment | Differentiation | Market Evidence |
|---|---|---|---|---|

Use only comparable evidence.

After the table, explain the most important competitive differences
in 2–4 short paragraphs.

Do not repeat every table value.

---------------------------------------------------------

# 5. Market Gaps and Opportunities

Combine market gaps and opportunities into one section.

For each important opportunity:

### Opportunity

What the opportunity is.

### Evidence

What supports it.

### Unmet Need

What remains underserved.

### Competitive Context

Who already addresses it.

### Business Relevance

Why it matters.

Only include evidence-supported or clearly labelled
potential opportunities.

Avoid generic advice.

---------------------------------------------------------

# 6. Risks and Recent Developments

Combine these into one section.

Cover only important:
- competitive risks
- regulatory risks
- technology risks
- financial risks
- operational risks
- adoption risks
- recent launches
- partnerships
- investments
- expansions
- competitor moves

For important risks use:

Risk → Evidence → Potential Impact

For recent developments include dates when available.

---------------------------------------------------------

# 7. Key Insights

Provide only 3–4 genuinely useful insights.

Each insight should contain:

**Finding:** What the evidence shows.

**Meaning:** What it indicates.

**Business implication:** Why it matters.

Do NOT simply repeat statistics.

---------------------------------------------------------

# Conclusion

Answer the original question directly in 1–2 short paragraphs.

Do not introduce new information.

Do not repeat the entire Executive Brief.

---------------------------------------------------------

# Sources

List only sources actually present in the supplied research.

Format:

- Source Title — URL

=========================================================
IMPORTANT DEDUPLICATION RULE
=========================================================

Before returning the report, mentally check every major fact.

If the same fact appears more than once:

1. Keep the strongest occurrence.
2. Remove the repeated occurrence.
3. Replace repetition with interpretation.

Example:

BAD:

Executive Brief:
"Tata has approximately 39% market share."

Competitive Landscape:
"Tata has approximately 39% market share."

Strategic Insights:
"Tata's approximately 39% market share shows leadership."

Conclusion:
"Tata leads with approximately 39% market share."

GOOD:

Executive Brief:
"Tata is the leading player in the researched market."

Market Overview:
"Tata held approximately 39% market share in FY2026."

Competitive Landscape:
"MG and Mahindra are the major direct challengers."

Strategic Insight:
"The competitive structure indicates a concentrated market."

Conclusion:
"The market is led by Tata, with MG and Mahindra representing
the principal challengers."

The exact number is used once.

=========================================================
MARKDOWN RULES
=========================================================

Return normal Markdown.

Use:

# Heading
## Subheading
### Small heading
**Bold**
- Bullet
| Table |

NEVER escape Markdown.

Never output:

\\#
\\*
\\_
\\-
\\[
\\]
\\|

Use normal Markdown characters.

For URLs use:

https://example.com

Never use:

https\\://example.com

Do not use raw HTML.

=========================================================
FINAL QUALITY CHECK
=========================================================

Before returning the report verify:

- The exact user question is answered.
- The report is concise.
- Every section contributes useful information.
- No unnecessary section exists.
- Market statistics are not repeatedly copied.
- Company facts are not repeatedly copied.
- Competitors are clearly classified.
- Comparisons use compatible metrics and periods.
- Opportunities are evidence-based.
- Risks are evidence-based.
- Facts and interpretations are distinguishable.
- Missing information is clearly identified.
- No statistics are invented.
- No prices are invented.
- No company facts are invented.
- No fake URLs are created.
- Sources actually support the claims.
- Executive Brief does not duplicate the entire report.
- Conclusion does not duplicate Executive Brief.
- Key Insights add interpretation rather than repetition.
- The final report is useful to a business analyst.

=========================================================
FINAL INSTRUCTION
=========================================================

Return ONLY the completed business research report.

Do not explain the writing process.
Do not mention these instructions.
Do not mention that you are an AI.
"""

    # =====================================================
    # REVISION REPORT
    # =====================================================

    else:

        prompt = f"""
You are a Senior Business Research Analyst revising a report.

Improve the existing report using the reviewer feedback and
the supplied evidence.

=========================================================
USER QUESTION
=========================================================

{user_query}

=========================================================
PREVIOUS REPORT
=========================================================

{previous_draft}

=========================================================
REVIEWER FEEDBACK
=========================================================

{review_feedback}

=========================================================
ANALYSIS
=========================================================

{analysis}

=========================================================
MARKET RESEARCH
=========================================================

{market_research}

=========================================================
COMPANY RESEARCH
=========================================================

{company_research}

=========================================================
COMPETITOR RESEARCH
=========================================================

{competitor_research}

=========================================================
REVISION RULES
=========================================================

1. Directly answer the original question.

2. Apply valid reviewer feedback.

3. Preserve accurate evidence.

4. Remove unsupported claims.

5. Add information only when supported by the supplied research.

6. Remove unnecessary sections.

7. Remove repeated statistics.

8. Remove repeated company facts.

9. Remove repeated conclusions.

10. Keep important time periods.

11. Use compatible metrics when comparing companies.

12. Keep direct, indirect and emerging competitors separate.

13. Improve market-gap analysis.

14. Improve opportunity analysis.

15. Improve risk analysis.

16. Make strategic insights analytical rather than repetitive.

17. Do not invent statistics.

18. Do not invent prices.

19. Do not invent company facts.

20. Do not invent market share.

21. Do not invent URLs.

22. Clearly distinguish facts from interpretation.

23. Clearly identify uncertainty.

24. Return clean standard Markdown.

=========================================================
REPORT STRUCTURE
=========================================================

# Executive Brief

# 1. Market Overview

# 2. Market Drivers and Customer Demand

# 3. Company and Competitive Landscape

# 4. Competitive Comparison

# 5. Market Gaps and Opportunities

# 6. Risks and Recent Developments

# 7. Key Insights

# Conclusion

# Sources

=========================================================
REVISION PRIORITY
=========================================================

When reducing repetition:

Keep quantitative evidence in the section where it is
most useful.

Use other sections for interpretation rather than repeating
the same numbers.

The revised report should normally be shorter than the
previous report unless the reviewer specifically requires
additional evidence.

=========================================================
MARKDOWN
=========================================================

Return normal Markdown.

Do not escape:

#
*
_
-
[
]
|

Never output:

\\#
\\*
\\_
\\-
\\[
\\]
\\|

Use real URLs only from supplied research.

=========================================================
FINAL INSTRUCTION
=========================================================

Return ONLY the revised business research report.

Do not explain the revision process.
Do not mention these instructions.
"""

    # =====================================================
    # GENERATE REPORT
    # =====================================================

    response = generate_response(prompt)

    # =====================================================
    # CLEAN REPORT
    # =====================================================

    return clean_report_markdown(response)