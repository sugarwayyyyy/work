#!/usr/bin/env bash
set -euo pipefail

MESSAGE="chore: update project files"
TAG=""
PUSH_IF_NO_CHANGES=false

usage() {
  cat <<'EOF'
Usage:
  ./scripts/git-push-all.sh [-m MESSAGE] [-t TAG] [--push-if-no-changes]

Examples:
  ./scripts/git-push-all.sh -m "update frontend layout"
  ./scripts/git-push-all.sh -m "release version 1.1" -t "v1.1"
  ./scripts/git-push-all.sh
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -m|--message)
      MESSAGE="${2:-}"
      shift 2
      ;;
    -t|--tag)
      TAG="${2:-}"
      shift 2
      ;;
    --push-if-no-changes)
      PUSH_IF_NO_CHANGES=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "${MESSAGE// }" ]]; then
  MESSAGE="chore: update project files"
fi

if ! command -v git >/dev/null 2>&1; then
  echo "Error: git not found." >&2
  exit 1
fi

if [[ "$(git rev-parse --is-inside-work-tree 2>/dev/null || true)" != "true" ]]; then
  echo "Error: current directory is not a Git repository." >&2
  exit 1
fi

BRANCH="$(git branch --show-current | tr -d '[:space:]')"
if [[ -z "$BRANCH" ]]; then
  echo "Error: cannot detect current branch (detached HEAD?)." >&2
  exit 1
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  echo "Error: remote 'origin' not found." >&2
  exit 1
fi

echo "Current branch: $BRANCH"
echo
echo "Current Git status:"
git status

echo
echo "Running git add -A ..."
git add -A

DID_COMMIT=false
if git diff --cached --quiet; then
  echo "No new changes to commit."
else
  echo "Committing changes..."
  git commit -m "$MESSAGE"
  DID_COMMIT=true
fi

SHOULD_PUSH_BRANCH=false
if [[ "$DID_COMMIT" == "true" || "$PUSH_IF_NO_CHANGES" == "true" || -n "$TAG" ]]; then
  SHOULD_PUSH_BRANCH=true
fi

if [[ "$SHOULD_PUSH_BRANCH" == "true" ]]; then
  echo
  echo "Pushing branch to origin/$BRANCH ..."
  git push origin "$BRANCH"
else
  echo
  echo "Skip pushing branch (use --push-if-no-changes to push without new commit)."
fi

DID_TAG=false
if [[ -n "$TAG" ]]; then
  echo
  echo "Checking tag: $TAG"

  if git show-ref --verify --quiet "refs/tags/$TAG"; then
    echo "Error: local tag already exists: $TAG" >&2
    exit 1
  fi

  if [[ -n "$(git ls-remote --tags origin "refs/tags/$TAG")" ]]; then
    echo "Error: remote tag already exists on origin: $TAG" >&2
    exit 1
  fi

  echo "Creating annotated tag: $TAG"
  git tag -a "$TAG" -m "Release $TAG"

  echo "Pushing tag: $TAG"
  git push origin "$TAG"
  DID_TAG=true
fi

HEAD_SHORT="$(git rev-parse --short HEAD)"
echo
echo "Summary"
echo "- Branch: $BRANCH"
echo "- HEAD: $HEAD_SHORT"
echo "- Commit created: $DID_COMMIT"
echo "- Branch pushed: $SHOULD_PUSH_BRANCH"
echo "- Tag created and pushed: $DID_TAG"


