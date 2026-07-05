# Use AWS Lambda Python runtime base image (same family as lambdas/graphql-service,
# so this one image serves both the Phase 3 Lambda deploy and local docker-compose dev).
FROM public.ecr.aws/lambda/python:3.11

WORKDIR ${LAMBDA_TASK_ROOT}

COPY pyproject.toml ./
RUN pip install --no-cache-dir .

COPY app ./app
COPY alembic.ini ./

# Lambda entrypoint. docker-compose overrides this with `uvicorn` for local dev.
CMD ["app.main.handler"]
