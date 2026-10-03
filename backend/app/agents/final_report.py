from app.llm import generate_response
import re


# =========================================================
# MARKDOWN CLEANUP
# =========================================================

def clean_final_report(report: str) -> str:
    """
    Remove unnecessary escaping introduced by the LLM
    while preserving valid Markdown syntax.
    """

    cleaned = report.strip()

    # Remove a single unnecessary backslash before Markdown
    # punctuation such as #, -, *, _, [, ], (, ), etc.
    cleaned = re.sub(
        r'\\([#*_+\-.,:;()\[\]{}~!|])',
        r'\1',
        cleaned
    )

    # Fix escaped URL separators.
    cleaned = cleaned.replace(r"\://", "://")
    cleaned = cleaned.replace(r"\/", "/")

    # Convert literal Unicode escape sequences into characters.
    cleaned = cleaned.replace(r"\u2014", "—")
    cleaned = cleaned.replace(r"\u2013", "–")
    cleaned = cleaned.replace(r"\u2019", "’")
    cleaned = cleaned.replace(r"\u2018", "‘")
    cleaned = cleaned.replace(r"\u201c", "“")
    cleaned = cleaned.replace(r"\u201d", "”")

    # Reduce duplicated backslashes.
    cleaned = cleaned.replace("\\\\", "\\")

    # Remove accidental spaces before punctuation.
    cleaned = re.sub(
        r"[ \t]+([,.;:])",
        r"\1",
        cleaned
    )

    return cleaned.strip()


# =========================================================
# FINAL REPORT AGENT
# =========================================================

def final_report_agent(
    draft_report: str,
    review_feedback: str
) -> str:

    prompt = f"""
You are the Final Report Agent in an Agentic AI Business Research System.

Your job is to finalize the existing report.

IMPORTANT RULES:

- Preserve the report's existing Markdown structure.
- Do NOT rewrite the report unnecessarily.
- Do NOT create a completely new report.
- Do NOT add new facts.
- Do NOT add new sources.
- Do NOT repeat information.
- Keep the report concise.
- Apply only valid corrections from the reviewer.

=========================================================
DRAFT REPORT
=========================================================

{draft_report}

=========================================================
REVIEWER FEEDBACK
=========================================================

{review_feedback}

=========================================================
FINALIZATION RULES
=========================================================

1. Keep the useful information already present in the draft.

2. Apply only reviewer feedback that is supported by the
   existing research and draft.

3. Remove unsupported, exaggerated, repetitive or unclear
   statements.

4. Preserve the existing report structure.

5. Preserve Markdown headings, bullets and tables.

6. NEVER escape Markdown characters.

Correct:

# Market Overview

- Market growth

**Company Name**

Incorrect:

\\# Market Overview

\\- Market growth

\\*\\*Company Name\\*\\*

7. URLs must remain normal URLs.

Correct:

https://example.com

Incorrect:

https\\://example.com

8. Do not write a new introduction or conclusion if the
   existing sections already provide them.

9. Do not repeat the same fact in multiple sections.

10. Do not use unsupported evaluative claims such as
    "best", "dominant", "must", "clearly superior" or
    "guaranteed" unless directly supported by the research.

11. Return ONLY the final Markdown report.

12. Do not include explanations about what you changed.
"""

    # Generate the final report.
    response = generate_response(prompt)

    # Clean Markdown escaping introduced by the LLM.
    return clean_final_report(response)