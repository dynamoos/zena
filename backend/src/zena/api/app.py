from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from zena.api.routes import auth, cases, dashboard, locations, persons, reports, stage_statuses, stages, users
from zena.infrastructure.config import settings


def create_app() -> FastAPI:
    app = FastAPI(
        title="Zena",
        description="Legal case management system for property disputes",
        version="0.1.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
    app.include_router(persons.router, prefix="/api/persons", tags=["Persons"])
    app.include_router(locations.router, prefix="/api/locations", tags=["Locations"])
    app.include_router(cases.router, prefix="/api/cases", tags=["Cases"])
    app.include_router(stages.router, prefix="/api/cases", tags=["Stages"])
    app.include_router(
        stage_statuses.router,
        prefix="/api/admin/stage-statuses",
        tags=["Stage Statuses"],
    )
    app.include_router(
        dashboard.router, prefix="/api/dashboard", tags=["Dashboard"]
    )
    app.include_router(users.router, prefix="/api/users", tags=["Users"])
    app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])

    @app.get("/api/health")
    async def health_check():
        return {"status": "ok"}

    return app


app = create_app()
