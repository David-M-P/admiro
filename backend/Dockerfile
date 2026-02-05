###############################
# Dockerfile for FastAPI App  #
###############################

# Base image: Python 3.12 slim
FROM python:3.12-slim

# Do not write .pyc files, and unbuffered stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set working directory
WORKDIR /app

# Install system dependencies needed by NumPy/Polars
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    build-essential gcc libpq-dev libopenblas-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
# Copy and install Python dependencies
COPY requirements.txt /app/
RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy application code (app.py, services/, etc.)
COPY . /app

# Expose the port Uvicorn will listen on
EXPOSE 8000

# Default command: run uvicorn on the FastAPI app
CMD ["uvicorn", "admiro_backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--app-dir", "/app/src"]

