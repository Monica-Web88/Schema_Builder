from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from strawberry.fastapi import GraphQLRouter

from app.database import Base, engine
from app.graphql_schema import schema as graphql_schema
from app.rest_routes import router as rest_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Schema Forge",
    description="A hosted authoring platform that turns JSON schemas into live, runtime-rendered UIs.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # demo only — lock this down in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rest_router, tags=["rest"])

graphql_app = GraphQLRouter(graphql_schema)
app.include_router(graphql_app, prefix="/graphql", tags=["graphql"])


@app.get("/health")
def health():
    return {"status": "ok"}
