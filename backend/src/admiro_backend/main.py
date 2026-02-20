from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from admiro_backend.settings import get_settings
from admiro_backend.api.routes import router
from starlette.middleware.gzip import GZipMiddleware


def create_app() -> FastAPI:
    s = get_settings()
    app = FastAPI()
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=s.cors_origins,
        allow_credentials=False if s.cors_origins == ["*"] else True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/")
    async def root():
        return {"status": "ok", "env": s.admiro_env}

    app.include_router(router)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ):
        return JSONResponse(status_code=422, content={"detail": exc.errors()})

    return app


app = create_app()
