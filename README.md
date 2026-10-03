# Agentic AI Business Research & Analysis System

An Agentic AI-powered business research and analysis system that automatically transforms a business research question into a structured research report using multiple specialized AI agents.

The system uses LangGraph to coordinate specialized agents, Gemini for AI-powered reasoning and generation, Tavily for web research, PostgreSQL for report persistence, and a Next.js frontend for an interactive research experience.

---

## Overview

Business research usually requires collecting information about markets, companies, competitors, trends, opportunities, and risks from multiple sources.

This project automates that workflow using a multi-agent architecture.

Instead of depending on a single AI response, the system divides the research process into specialized tasks and assigns each task to a dedicated agent.

The agents work together through a controlled LangGraph workflow and share information through a common state.

The generated report is also reviewed before the final report is produced.

---

## Problem Statement

Business research is a multi-step and time-consuming process. Whenever a company wants to understand a market, it needs to collect information about the market, target company, competitors, customer trends, opportunities, and risks from different sources.

These tasks are often performed manually or using a general AI chatbot.

A general chatbot may provide an answer, but it does not necessarily organize the complete research process into specialized tasks, independently investigate different aspects, review the generated analysis, and maintain the workflow between these tasks.

Therefore, this project develops an Agentic AI-based Business Research and Intelligence System that can:

- Understand a business research question
- Automatically plan research tasks
- Perform specialized market research
- Analyze company information
- Research competitors
- Combine research findings
- Generate a structured business report
- Review the generated report
- Produce a final research report
- Store completed reports for later access

---

## System Workflow

```text
                         User
                           |
                           v
                  +----------------+
                  | Planner Agent  |
                  +----------------+
                           |
          +----------------+----------------+
          |                |                |
          v                v                v
 +----------------+ +----------------+ +-------------------+
 | Market Agent   | | Company Agent  | | Competitor Agent  |
 +----------------+ +----------------+ +-------------------+
          |                |                |
          +----------------+----------------+
                           |
                           v
                  +----------------+
                  | Analysis Agent |
                  +----------------+
                           |
                           v
                  +----------------+
                  |  Writer Agent  |
                  +----------------+
                           |
                           v
                  +----------------+
                  | Reviewer Agent |
                  +----------------+
                           |
                  +--------+--------+
                  |                 |
              Revision           Approved
                  |                 |
                  v                 v
              Writer Agent   Final Report Agent
                                    |
                                    v
                            Structured Report
                                    |
                                    v
                              PostgreSQL