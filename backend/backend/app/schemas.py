from pydantic import BaseModel, Field


# ---------------------------------------------------------
# RESEARCH REQUEST
# ---------------------------------------------------------

# Request body used when starting a new business research task
class ResearchRequest(BaseModel):

    # User's actual research question
    # Minimum length prevents empty or meaningless requests
    user_query: str = Field(
        ...,
        min_length=5,
        max_length=1000,
        description="Business research question provided by the user"
    )


# ---------------------------------------------------------
# RESEARCH RESPONSE
# ---------------------------------------------------------

# Response returned after the complete research workflow finishes
class ResearchResponse(BaseModel):

    message: str
    report_id: int
    final_report: str
    created_at: str


# ---------------------------------------------------------
# REPORT RESPONSE
# ---------------------------------------------------------

# Standard structure returned when fetching a saved report
class ReportResponse(BaseModel):

    id: int
    user_query: str
    final_report: str
    created_at: str