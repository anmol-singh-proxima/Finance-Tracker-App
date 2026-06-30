# Use AWS Lambda Python runtime base image
FROM public.ecr.aws/lambda/python:3.11

# Copy requirements
COPY requirements.txt ${LAMBDA_TASK_ROOT}/

# Install dependencies
RUN pip install --no-cache-dir -r ${LAMBDA_TASK_ROOT}/requirements.txt

# Copy Lambda function code
COPY handler.py ${LAMBDA_TASK_ROOT}/
COPY schema.py ${LAMBDA_TASK_ROOT}/
COPY resolvers.py ${LAMBDA_TASK_ROOT}/

# Set the CMD to your handler
CMD ["handler.lambda_handler"]
