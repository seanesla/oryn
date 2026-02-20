#!/usr/bin/env bash
set -euo pipefail

# Deploy the Web UI (apps/web) to Cloud Run.
#
# Usage:
#   infra/cloudrun/deploy_web.sh YOUR_GCP_PROJECT_ID NEXT_PUBLIC_API_BASE_URL [REGION]

PROJECT_ID=${1:?"Missing PROJECT_ID"}
API_BASE_URL=${2:?"Missing NEXT_PUBLIC_API_BASE_URL"}
REGION=${3:-us-central1}

SERVICE_NAME=oryn-web
REPO_NAME=oryn
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}"

echo "Setting gcloud project: ${PROJECT_ID}"
gcloud config set project "${PROJECT_ID}" --quiet

echo "Enabling required APIs (Run, Build, Artifact Registry)"
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  --project "${PROJECT_ID}" \
  --quiet

echo "Ensuring Artifact Registry repo exists: ${REPO_NAME} (${REGION})"
gcloud artifacts repositories describe "${REPO_NAME}" \
  --location "${REGION}" \
  --project "${PROJECT_ID}" \
  --quiet >/dev/null 2>&1 \
  || gcloud artifacts repositories create "${REPO_NAME}" \
    --repository-format=docker \
    --location "${REGION}" \
    --project "${PROJECT_ID}" \
    --description "oryn container images" \
    --quiet

PROJECT_NUMBER=$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')
CB_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
RUN_SA_AGENT="service-${PROJECT_NUMBER}@serverless-robot-prod.iam.gserviceaccount.com"

SA_NAME=oryn-cloudrun
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "Ensuring Cloud Run service account exists: ${SA_EMAIL}"
gcloud iam service-accounts describe "${SA_EMAIL}" \
  --project "${PROJECT_ID}" \
  --quiet >/dev/null 2>&1 \
  || gcloud iam service-accounts create "${SA_NAME}" \
    --project "${PROJECT_ID}" \
    --display-name "oryn Cloud Run runtime" \
    --quiet

echo "Granting Artifact Registry write to Cloud Build SA: ${CB_SA}"
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member "serviceAccount:${CB_SA}" \
  --role "roles/artifactregistry.writer" \
  --quiet

echo "Granting Artifact Registry read to Cloud Run agents"
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member "serviceAccount:${SA_EMAIL}" \
  --role "roles/artifactregistry.reader" \
  --quiet
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member "serviceAccount:${RUN_SA_AGENT}" \
  --role "roles/artifactregistry.reader" \
  --quiet

echo "Building container image: ${IMAGE}"
gcloud builds submit . \
  --project "${PROJECT_ID}" \
  --config "apps/web/cloudbuild.yaml" \
  --substitutions "_IMAGE=${IMAGE},_NEXT_PUBLIC_API_BASE_URL=${API_BASE_URL}" \
  --quiet

echo "Deploying to Cloud Run: ${SERVICE_NAME} (${REGION})"
gcloud run deploy "${SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --image "${IMAGE}" \
  --allow-unauthenticated \
  --service-account "${SA_EMAIL}" \
  --min-instances 0 \
  --max-instances 1 \
  --quiet

echo "Done. Fetch service URL:"
echo "  gcloud run services describe ${SERVICE_NAME} --project ${PROJECT_ID} --region ${REGION} --format='value(status.url)'"
