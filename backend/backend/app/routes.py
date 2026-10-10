import json
import queue
import threading
import traceback

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ResearchReport
from app.graph import run_business_research
from app.schemas import ResearchRequest, ResearchResponse, ReportResponse
from app.llm import LLMRateLimitError


# =========================================================
# API ROUTER
# =========================================================

router = APIRouter()


def build_agent_results(result: dict, final_report: str) -> dict:
    """Return the actual outputs produced by the LangGraph agents."""
    return {
        "research_plan": result.get("research_plan", []),
        "market_research": result.get("market_research", []),
        "company_research": result.get("company_research", []),
        "competitor_research": result.get("competitor_research", []),
        "analysis": result.get("analysis", ""),
        "draft": result.get("draft_report", ""),
        "review": result.get("review_feedback", ""),
        "final_report": final_report,
    }


# =========================================================
# CREATE REPORT
# =========================================================
# Saves an already-generated research report to PostgreSQL.
# =========================================================

@router.post("/reports")
def create_report(
    user_query: str,
    final_report: str,
    db: Session = Depends(get_db)
):

    report = ResearchReport(
        user_query=user_query,
        final_report=final_report
    )

    db.add(report)
    db.commit()
    db.refresh(report)

    return {
        "message": "Research report saved successfully",
        "report_id": report.id,
        "created_at": report.created_at
    }


# =========================================================
# GET ALL REPORTS
# =========================================================

@router.get(
    "/reports",
    response_model=list[ReportResponse]
)
def get_reports(
    db: Session = Depends(get_db)
):

    reports = db.query(
        ResearchReport
    ).order_by(
        ResearchReport.created_at.desc()
    ).all()

    return [
        {
            "id": report.id,
            "user_query": report.user_query,
            "final_report": report.final_report,
            "created_at": report.created_at.isoformat()
        }
        for report in reports
    ]


# =========================================================
# GET SINGLE REPORT
# =========================================================

@router.get(
    "/reports/{report_id}",
    response_model=ReportResponse
)
def get_report(
    report_id: int,
    db: Session = Depends(get_db)
):

    report = db.query(
        ResearchReport
    ).filter(
        ResearchReport.id == report_id
    ).first()

    if report is None:
        raise HTTPException(
            status_code=404,
            detail="Research report not found"
        )

    return {
        "id": report.id,
        "user_query": report.user_query,
        "final_report": report.final_report,
        "created_at": report.created_at.isoformat(),
        "agent_results": report.agent_results,
        "activity_events": report.activity_events,
    }


# =========================================================
# DELETE SINGLE REPORT
# =========================================================

@router.delete("/reports/{report_id}")
def delete_report(
    report_id: int,
    db: Session = Depends(get_db)
):

    report = db.query(
        ResearchReport
    ).filter(
        ResearchReport.id == report_id
    ).first()

    if report is None:
        raise HTTPException(
            status_code=404,
            detail="Research report not found"
        )

    db.delete(report)
    db.commit()

    return {
        "message": "Research report deleted successfully",
        "report_id": report_id
    }


# =========================================================
# NORMAL RESEARCH ENDPOINT
# =========================================================
# This endpoint runs the complete workflow and returns the
# final report as JSON.
# =========================================================

@router.post(
    "/research",
    response_model=ResearchResponse
)
def research(
    request: ResearchRequest,
    db: Session = Depends(get_db)
):

    try:

        # -------------------------------------------------
        # Get validated user query.
        # -------------------------------------------------

        user_query = request.user_query.strip()

        # -------------------------------------------------
        # Run complete LangGraph workflow.
        # -------------------------------------------------

        result = run_business_research(
            user_query
        )

        # -------------------------------------------------
        # Get final report.
        # -------------------------------------------------

        final_report = result.get(
            "final_report"
        )

        if not final_report:

            raise HTTPException(
                status_code=500,
                detail=(
                    "Research workflow did not "
                    "generate a final report."
                )
            )

        # -------------------------------------------------
        # Save report.
        # -------------------------------------------------

        report = ResearchReport(
            user_query=user_query,
            final_report=final_report,
            agent_results=build_agent_results(result, final_report),
            activity_events=[],
        )

        db.add(report)
        db.commit()
        db.refresh(report)

        return {
            "message": (
                "Business research completed successfully"
            ),
            "report_id": report.id,
            "final_report": final_report,
            "created_at": report.created_at.isoformat()
        }

    except LLMRateLimitError as error:

        print("\n" + "=" * 80)
        print("GEMINI RATE LIMIT ERROR")
        print("=" * 80)
        traceback.print_exc()
        print("=" * 80 + "\n")

        raise HTTPException(
            status_code=429,
            detail=str(error)
        )

    except HTTPException:

        raise

    except Exception as error:

        # -------------------------------------------------
        # IMPORTANT DEBUGGING OUTPUT
        # -------------------------------------------------
        # This prints the COMPLETE traceback in the backend
        # terminal instead of hiding the real exception.
        # -------------------------------------------------

        print("\n" + "=" * 80)
        print("BUSINESS RESEARCH ERROR")
        print("=" * 80)
        print(f"Error type: {type(error).__name__}")
        print(f"Error message: {str(error)}")
        print("-" * 80)
        traceback.print_exc()
        print("=" * 80 + "\n")

        # Roll back database changes.
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                f"Business research failed: {str(error)}"
            )
        )


# =========================================================
# LIVE RESEARCH PROGRESS - SERVER SENT EVENTS
# =========================================================
# This endpoint streams live agent progress to the frontend.
#
# Example:
#
# Planner       → running
# Planner       → completed
# Market        → running
# Market        → completed
# Company       → running
# Company       → completed
# ...
# Final Report  → completed
# =========================================================

@router.post("/research/stream")
def research_stream(
    request: ResearchRequest,
    db: Session = Depends(get_db)
):

    # =====================================================
    # THREAD-SAFE EVENT QUEUE
    # =====================================================

    events = queue.Queue()

    # Used to know when the background worker finishes.
    finished = threading.Event()
    activity_events = []
    activity_events_lock = threading.Lock()

    # Stores either the final result or the error.
    worker_result = {
        "result": None,
        "error": None
    }

    # =====================================================
    # GET USER QUERY
    # =====================================================

    user_query = request.user_query.strip()

    if not user_query:

        raise HTTPException(
            status_code=422,
            detail="Research question cannot be empty."
        )

    # =====================================================
    # PROGRESS CALLBACK
    # =====================================================
    # LangGraph calls this whenever an agent changes state.
    # =====================================================

    def progress_callback(event: dict):
        with activity_events_lock:
            activity_events.append(event)
        events.put(event)

    # =====================================================
    # BACKGROUND WORKER
    # =====================================================
    # The actual LangGraph workflow runs here so the API can
    # stream progress to the frontend.
    # =====================================================

    def run_workflow():

        try:

            print("\n" + "=" * 80)
            print("RESEARCH WORKFLOW STARTED")
            print("=" * 80)
            print(f"User query:\n{user_query}")
            print("=" * 80 + "\n")

            # -------------------------------------------------
            # Run complete Agentic AI workflow.
            # -------------------------------------------------

            result = run_business_research(
                user_query,
                progress_callback=progress_callback
            )

            # Store completed result.
            worker_result["result"] = result

            print("\n" + "=" * 80)
            print("RESEARCH WORKFLOW COMPLETED")
            print("=" * 80 + "\n")

        except LLMRateLimitError as error:

            # -------------------------------------------------
            # Gemini rate-limit debugging.
            # -------------------------------------------------

            print("\n" + "=" * 80)
            print("GEMINI RATE LIMIT ERROR")
            print("=" * 80)
            print(f"Error: {error}")
            traceback.print_exc()
            print("=" * 80 + "\n")

            worker_result["error"] = {
                "status_code": 429,
                "detail": str(error)
            }

        except Exception as error:

            # =================================================
            # THIS IS THE IMPORTANT PART
            # =================================================
            #
            # Previously the actual exception was hidden.
            #
            # Now the complete traceback will appear in the
            # backend terminal.
            #
            # This will tell us exactly whether the problem is:
            #
            # - company.py
            # - competitor.py
            # - Tavily
            # - Gemini
            # - planner output
            # - LangGraph
            # - another dependency
            # =================================================

            print("\n")
            print("=" * 80)
            print("!!! RESEARCH WORKFLOW ERROR !!!")
            print("=" * 80)

            print(
                f"Error type: {type(error).__name__}"
            )

            print(
                f"Error message: {str(error)}"
            )

            print("-" * 80)
            print("FULL TRACEBACK")
            print("-" * 80)

            traceback.print_exc()

            print("=" * 80)
            print("!!! END RESEARCH WORKFLOW ERROR !!!")
            print("=" * 80)
            print("\n")

            # -------------------------------------------------
            # Send useful error to SSE stream.
            # -------------------------------------------------

            worker_result["error"] = {
                "status_code": 500,
                "detail": (
                    f"{type(error).__name__}: {str(error)}"
                )
            }

        finally:

            # Tell event_stream() that worker execution ended.
            finished.set()

    # =====================================================
    # START BACKGROUND THREAD
    # =====================================================

    worker = threading.Thread(
        target=run_workflow,
        daemon=True
    )

    worker.start()

    # =====================================================
    # SSE EVENT STREAM
    # =====================================================

    def event_stream():

        # -------------------------------------------------
        # Tell frontend that research started.
        # -------------------------------------------------

        yield (
            "event: research_started\n"
            f"data: {json.dumps({
                'message': 'Research started'
            })}\n\n"
        )

        # -------------------------------------------------
        # Continue while the worker is running OR events
        # are still waiting in the queue.
        # -------------------------------------------------

        while (
            not finished.is_set()
            or not events.empty()
        ):

            try:

                # Wait for next agent progress event.
                event = events.get(
                    timeout=0.5
                )

                yield (
                    "event: agent_progress\n"
                    f"data: {json.dumps(event)}\n\n"
                )

            except queue.Empty:

                continue

        # =================================================
        # WORKFLOW ERROR
        # =================================================

        if worker_result["error"] is not None:

            error_data = worker_result["error"]

            yield (
                "event: research_error\n"
                f"data: {json.dumps(error_data)}\n\n"
            )

            return

        # =================================================
        # GET COMPLETED WORKFLOW RESULT
        # =================================================

        result = worker_result["result"]

        if result is None:

            yield (
                "event: research_error\n"
                f"data: {json.dumps({
                    'detail': (
                        'No research result was generated.'
                    )
                })}\n\n"
            )

            return

        # =================================================
        # GET FINAL REPORT
        # =================================================

        final_report = result.get(
            "final_report"
        )

        if not final_report:

            yield (
                "event: research_error\n"
                f"data: {json.dumps({
                    'detail': (
                        'Research workflow did not '
                        'generate a final report.'
                    )
                })}\n\n"
            )

            return

        # =================================================
        # SAVE FINAL REPORT
        # =================================================

        try:

            report = ResearchReport(
                user_query=user_query,
                final_report=final_report,
                agent_results=build_agent_results(
                    worker_result["result"],
                    final_report,
                ),
                activity_events=list(activity_events),
            )

            db.add(report)
            db.commit()
            db.refresh(report)

            # -------------------------------------------------
            # Send completed event.
            # -------------------------------------------------

            completion_payload = {
                "message": "Business research completed successfully",
                "report_id": report.id,
                "final_report": final_report,
                "agent_results": build_agent_results(
                    worker_result["result"],
                    final_report,
                ),
                "created_at": report.created_at.isoformat(),
            }

            yield (
                "event: research_completed\n"
                f"data: {json.dumps(completion_payload, default=str)}\n\n"
            )

        except Exception as error:

            # -------------------------------------------------
            # Database save error.
            # -------------------------------------------------

            print("\n" + "=" * 80)
            print("REPORT SAVE ERROR")
            print("=" * 80)
            print(
                f"Error type: {type(error).__name__}"
            )
            print(
                f"Error message: {str(error)}"
            )
            traceback.print_exc()
            print("=" * 80 + "\n")

            db.rollback()

            yield (
                "event: research_error\n"
                f"data: {json.dumps({
                    'detail': (
                        'Research completed, but the '
                        'report could not be saved.'
                    )
                })}\n\n"
            )

    # =====================================================
    # RETURN SSE RESPONSE
    # =====================================================

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
