#!/usr/bin/env bash
set -euo pipefail

# Cleanup all Cloud Run resources for this repo.
#
# Usage:
#   infra/cloudrun/cleanup_all.sh YOUR_GCP_PROJECT_ID [REGION]

PROJECT_ID=${1:?"Missing PROJECT_ID"}
REGION=${2:-us-central1}

echo "Deleting Cloud Run services: oryn-api, oryn-web"
gcloud run services delete oryn-api --project "${PROJECT_ID}" --region "${REGION}" --quiet || true
gcloud run services delete oryn-web --project "${PROJECT_ID}" --region "${REGION}" --quiet || true

REPO_NAME=oryn
echo "Deleting Artifact Registry repo (removes images): ${REPO_NAME}"
gcloud artifacts repositories delete "${REPO_NAME}" \
  --project "${PROJECT_ID}" \
  --location "${REGION}" \
  --quiet || true

echo "(Optional) deleting service account created by deploy scripts"
SA_EMAIL="oryn-cloudrun@${PROJECT_ID}.iam.gserviceaccount.com"
gcloud iam service-accounts delete "${SA_EMAIL}" --project "${PROJECT_ID}" --quiet || true

echo "Done."
