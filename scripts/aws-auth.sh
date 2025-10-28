#!/bin/bash

# AWS SSO Authentication Script
# This script handles AWS SSO login and session management

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default AWS profile
AWS_PROFILE=${AWS_PROFILE:-default}

echo -e "${YELLOW}AWS SSO Authentication Script${NC}"
echo "Using AWS Profile: $AWS_PROFILE"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    echo "Please install AWS CLI: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check if SSO is configured
if ! aws configure list --profile $AWS_PROFILE | grep -q sso_start_url; then
    echo -e "${YELLOW}AWS SSO not configured for profile '$AWS_PROFILE'${NC}"
    echo "Please run: aws configure sso --profile $AWS_PROFILE"
    echo ""
    echo "You'll need:"
    echo "- SSO start URL (e.g., https://your-org.awsapps.com/start)"
    echo "- SSO region (e.g., us-east-1)"
    echo "- Account ID"
    echo "- Role name"
    echo "- Output format (json recommended)"
    exit 1
fi

# Check current session status
echo "Checking AWS SSO session status..."

if aws sts get-caller-identity --profile $AWS_PROFILE >/dev/null 2>&1; then
    echo -e "${GREEN}✓ AWS SSO session is active${NC}"
    
    # Show current identity
    IDENTITY=$(aws sts get-caller-identity --profile $AWS_PROFILE --output text --query 'Arn')
    echo "Current identity: $IDENTITY"
    
    # Check token expiration (if available)
    if command -v jq &> /dev/null; then
        TOKEN_FILE="$HOME/.aws/sso/cache/*.json"
        if ls $TOKEN_FILE 1> /dev/null 2>&1; then
            EXPIRES=$(ls -t $HOME/.aws/sso/cache/*.json | head -1 | xargs cat | jq -r '.expiresAt // empty' 2>/dev/null || echo "")
            if [ ! -z "$EXPIRES" ]; then
                echo "Token expires: $EXPIRES"
                
                # Convert expiration to epoch time for comparison
                if command -v date &> /dev/null; then
                    EXPIRES_EPOCH=$(date -d "$EXPIRES" +%s 2>/dev/null || echo "0")
                    CURRENT_EPOCH=$(date +%s)
                    REMAINING=$((EXPIRES_EPOCH - CURRENT_EPOCH))
                    
                    if [ $REMAINING -lt 3600 ]; then  # Less than 1 hour
                        echo -e "${YELLOW}⚠ Token expires in less than 1 hour, consider refreshing${NC}"
                    fi
                fi
            fi
        fi
    fi
else
    echo -e "${YELLOW}AWS SSO session expired or not authenticated${NC}"
    echo "Initiating SSO login..."
    
    # Perform SSO login
    aws sso login --profile $AWS_PROFILE
    
    # Verify login worked
    if aws sts get-caller-identity --profile $AWS_PROFILE >/dev/null 2>&1; then
        echo -e "${GREEN}✓ AWS SSO login successful${NC}"
        IDENTITY=$(aws sts get-caller-identity --profile $AWS_PROFILE --output text --query 'Arn')
        echo "Authenticated as: $IDENTITY"
    else
        echo -e "${RED}✗ AWS SSO login failed${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}AWS SSO authentication complete!${NC}"
echo ""
echo "You can now run database operations that require S3 access:"
echo "  npm run db:generate"
echo "  npm run db:migrate"
echo ""
echo "To logout: aws sso logout --profile $AWS_PROFILE"