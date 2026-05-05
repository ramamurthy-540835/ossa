FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
COPY docs/ docs/

# Cloud Run injects PORT (default 8080); config.py reads it
EXPOSE 8080
CMD ["python", "main.py"]
