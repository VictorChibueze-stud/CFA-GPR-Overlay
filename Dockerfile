FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (layer caching)
COPY api/requirements.txt ./api/requirements.txt
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt \
                                 -r api/requirements.txt

# Copy source
COPY src/ ./src/
COPY api/ ./api/
COPY convert_gpr_excel_to_csv.py .

# Copy data files the API reads at startup
COPY dashboard/public/data/gpr_daily.csv \
     ./dashboard/public/data/gpr_daily.csv
COPY dashboard/public/data/portfolio_default.csv \
     ./dashboard/public/data/portfolio_default.csv
COPY out/ ./out/

# Runtime state dir (sync job writes here)
RUN mkdir -p api/state

ENV GPR_SYNC_ENABLED=true
ENV API_HOST=0.0.0.0
ENV API_PORT=8000

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "api.main:app", \
     "--host", "0.0.0.0", "--port", "8000"]
