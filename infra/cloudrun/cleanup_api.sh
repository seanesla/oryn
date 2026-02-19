#!/usr/bin/env bash
set -euo pipefail

# Cleanup Cloud Run resources created by deploy_api.sh.
#
# Usage:
#   infra/cloudrun/cleanup_api.sh YOUR_GCP_PROJECT_ID [REGION]

PROJECT_ID=${1:?"Missing PROJECT_ID"}
REGION=${2:-us-central1}
SERVICE_NAME=oryn-api
REPO_NAME=oryn
SA_NAME=oryn-cloudrun
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "Deleting Cloud Run service: ${SERVICE_NAME}"
gcloud run services delete "${SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --quiet || true

echo "Deleting Artifact Registry repo (removes images): ${REPO_NAME}"
gcloud artifacts repositories delete "${REPO_NAME}" \
  --project "${PROJECT_ID}" \
  --location "${REGION}" \
  --quiet || true

echo "Deleting service account: ${SA_EMAIL}"
gcloud iam service-accounts delete "${SA_EMAIL}" \
  --project "${PROJECT_ID}" \
  --quiet || true

echo "Done. (IAM policy bindings may remain; safe to ignore for hackathon.)"
