#!/bin/bash
# 增量部署后端 Cloud Run 服务
set -e

# --- 配置 ---
REGION="us-central1"
SERVICE_ACCOUNT="498506838505-compute@developer.gserviceaccount.com"
FUNCTIONS_DIR="functions"
INDEX_FILE="$FUNCTIONS_DIR/index.js"
FUNCTIONS_PKG="$FUNCTIONS_DIR/package.json"

# handler -> Cloud Run 服务名映射
declare -A HANDLER_SERVICE_MAP=(
  ["trackClickHandler"]="track-click"
  ["grantAdminRoleHandler"]="grant-admin-role"
)

# --- 检查后端改动 ---
BACKEND_CHANGED_HANDLERS=()

# package.json 改动 → 部署所有 handler
if ! git diff --quiet HEAD -- "$FUNCTIONS_PKG"; then
  echo "🛠️  functions/package.json 有改动 → 部署所有 handler"
  for HANDLER in "${!HANDLER_SERVICE_MAP[@]}"; do
    BACKEND_CHANGED_HANDLERS+=("$HANDLER")
  done
fi

# index.js 改动 → 检查每个 handler 是否改动
if ! git diff --quiet HEAD -- "$INDEX_FILE"; then
  echo "🛠️  functions/index.js 有改动，检测 handler 修改..."
  for HANDLER in "${!HANDLER_SERVICE_MAP[@]}"; do
    if git diff HEAD -- "$INDEX_FILE" | grep -q "$HANDLER"; then
      BACKEND_CHANGED_HANDLERS+=("$HANDLER")
    fi
  done
fi

# --- 部署函数 ---
deploy_service() {
  local SERVICE_NAME=$1
  echo "🚀 部署服务: $SERVICE_NAME"
  gcloud run deploy "$SERVICE_NAME" \
    --source "$FUNCTIONS_DIR" \
    --region "$REGION" \
    --allow-unauthenticated \
    --service-account "$SERVICE_ACCOUNT" \
    --clear-base-image
}

# 部署改动的 handler
if [ ${#BACKEND_CHANGED_HANDLERS[@]} -gt 0 ]; then
  echo "🚀 部署后端改动的服务..."
  for HANDLER in "${BACKEND_CHANGED_HANDLERS[@]}"; do
    SERVICE_NAME="${HANDLER_SERVICE_MAP[$HANDLER]}"
    deploy_service "$SERVICE_NAME"
  done
else
  echo "✅ 后端没有改动，跳过部署。"
fi

echo "🎉 部署完成！"
