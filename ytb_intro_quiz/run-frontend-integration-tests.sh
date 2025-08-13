#!/bin/bash

# Frontend Integration Test Runner
# Comprehensive test execution script for JWT Authentication System

set -e

echo "🚀 Starting Frontend Integration Tests for JWT Authentication System"
echo "=================================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_URL=${FRONTEND_URL:-"http://localhost:8080"}
API_URL=${API_URL:-"http://localhost:3001"}
TEST_MODE=${TEST_MODE:-"all"}
DEBUG_MODE=${DEBUG_MODE:-"false"}
HEADLESS=${HEADLESS:-"true"}
CLEANUP_ARTIFACTS=${CLEANUP_ARTIFACTS:-"false"}

echo -e "${BLUE}Configuration:${NC}"
echo "  Frontend URL: $FRONTEND_URL"
echo "  API URL: $API_URL"
echo "  Test Mode: $TEST_MODE"
echo "  Debug Mode: $DEBUG_MODE"
echo "  Headless: $HEADLESS"
echo ""

# Function to check if service is running
check_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=1

    echo -e "${YELLOW}Checking $name at $url...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s --max-time 5 "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $name is running${NC}"
            return 0
        fi
        
        echo "⏳ $name not ready yet (attempt $attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
    
    echo -e "${RED}❌ $name failed to start after $max_attempts attempts${NC}"
    return 1
}

# Function to start services if not running
start_services() {
    echo -e "${BLUE}🔧 Starting services...${NC}"
    
    # Check if backend API is running
    if ! check_service "$API_URL/api/health" "Backend API"; then
        echo "Starting backend server..."
        npm run dev &
        BACKEND_PID=$!
        echo "Backend started with PID: $BACKEND_PID"
        
        # Wait for backend to be ready
        sleep 5
        if ! check_service "$API_URL/api/health" "Backend API"; then
            echo -e "${RED}❌ Failed to start backend server${NC}"
            exit 1
        fi
    fi
    
    # Check if frontend is running
    if ! check_service "$FRONTEND_URL" "Frontend Server"; then
        echo "Starting frontend server..."
        npx http-server public -p 8080 -c-1 --cors &
        FRONTEND_PID=$!
        echo "Frontend started with PID: $FRONTEND_PID"
        
        # Wait for frontend to be ready
        sleep 3
        if ! check_service "$FRONTEND_URL" "Frontend Server"; then
            echo -e "${RED}❌ Failed to start frontend server${NC}"
            exit 1
        fi
    fi
}

# Function to install dependencies
install_dependencies() {
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    
    # Install npm dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing npm packages..."
        npm install
    fi
    
    # Install Playwright browsers if needed
    if ! npx playwright --version > /dev/null 2>&1; then
        echo "Installing Playwright..."
        npm install @playwright/test
    fi
    
    echo "Installing Playwright browsers..."
    npx playwright install
    
    echo -e "${GREEN}✅ Dependencies installed${NC}"
}

# Function to run specific test suite
run_tests() {
    local test_type=$1
    local config_file="playwright-frontend.config.ts"
    local report_dir="test-results/frontend-integration-report"
    
    echo -e "${BLUE}🧪 Running $test_type tests...${NC}"
    
    # Set environment variables
    export FRONTEND_URL=$FRONTEND_URL
    export API_URL=$API_URL
    export DEBUG=$DEBUG_MODE
    export HEADLESS=$HEADLESS
    export CLEANUP_ARTIFACTS=$CLEANUP_ARTIFACTS
    
    # Configure test command based on test type
    local test_command="npx playwright test --config=$config_file"
    
    case $test_type in
        "integration")
            test_command="$test_command --grep='Frontend Integration'"
            ;;
        "cross-browser")
            test_command="$test_command --grep='Cross-Browser'"
            ;;
        "security")
            test_command="$test_command --grep='Security Integration'"
            ;;
        "performance")
            test_command="$test_command --grep='Performance'"
            ;;
        "accessibility")
            test_command="$test_command --grep='Accessibility'"
            ;;
        "all")
            # Run all tests
            ;;
        *)
            echo -e "${RED}❌ Unknown test type: $test_type${NC}"
            return 1
            ;;
    esac
    
    # Add debug flags if enabled
    if [ "$DEBUG_MODE" = "true" ]; then
        test_command="$test_command --debug --headed"
    fi
    
    # Run the tests
    echo "Executing: $test_command"
    if $test_command; then
        echo -e "${GREEN}✅ $test_type tests passed${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_type tests failed${NC}"
        return 1
    fi
}

# Function to generate reports
generate_reports() {
    echo -e "${BLUE}📊 Generating test reports...${NC}"
    
    # Generate HTML report
    npx playwright show-report --host=127.0.0.1 &
    REPORT_PID=$!
    
    echo -e "${GREEN}📋 Test reports generated:${NC}"
    echo "  HTML Report: test-results/frontend-integration-report/index.html"
    echo "  JSON Results: test-results/frontend-integration-results.json"
    echo "  JUnit XML: test-results/frontend-integration-junit.xml"
    echo "  Screenshots: test-results/screenshots/"
    echo "  Videos: test-results/videos/"
    echo "  Summary: test-results/FRONTEND_INTEGRATION_SUMMARY.md"
    echo ""
    echo -e "${BLUE}📊 Report server started at: http://127.0.0.1:9323${NC}"
    echo "Press Ctrl+C to stop the report server"
    
    # Keep report server running
    wait $REPORT_PID
}

# Function to cleanup
cleanup() {
    echo -e "${BLUE}🧹 Cleaning up...${NC}"
    
    # Kill background processes
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
        echo "Backend server stopped"
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
        echo "Frontend server stopped"
    fi
    
    if [ ! -z "$REPORT_PID" ]; then
        kill $REPORT_PID 2>/dev/null || true
        echo "Report server stopped"
    fi
    
    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Function to show help
show_help() {
    echo "Frontend Integration Test Runner"
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -t, --test-mode     Test mode: all, integration, cross-browser, security, performance, accessibility (default: all)"
    echo "  -d, --debug         Enable debug mode (default: false)"
    echo "  -h, --headless      Run in headless mode (default: true)"
    echo "  -c, --cleanup       Cleanup artifacts after tests (default: false)"
    echo "  -r, --report-only   Only generate and show reports"
    echo "  --frontend-url      Frontend URL (default: http://localhost:8080)"
    echo "  --api-url          API URL (default: http://localhost:3001)"
    echo "  --help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Run all tests"
    echo "  $0 -t integration                    # Run only integration tests"
    echo "  $0 -t security -d                    # Run security tests in debug mode"
    echo "  $0 -r                                # Show reports only"
    echo "  $0 --frontend-url http://localhost:3000 # Use different frontend URL"
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--test-mode)
            TEST_MODE="$2"
            shift 2
            ;;
        -d|--debug)
            DEBUG_MODE="true"
            HEADLESS="false"
            shift
            ;;
        -h|--headless)
            HEADLESS="$2"
            shift 2
            ;;
        -c|--cleanup)
            CLEANUP_ARTIFACTS="true"
            shift
            ;;
        -r|--report-only)
            generate_reports
            exit 0
            ;;
        --frontend-url)
            FRONTEND_URL="$2"
            shift 2
            ;;
        --api-url)
            API_URL="$2"
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Main execution flow
main() {
    echo -e "${BLUE}🔍 Starting test execution...${NC}"
    
    # Install dependencies
    install_dependencies
    
    # Start services
    start_services
    
    # Run tests based on mode
    local exit_code=0
    
    case $TEST_MODE in
        "all")
            echo -e "${BLUE}🎯 Running complete test suite...${NC}"
            run_tests "integration" || exit_code=1
            run_tests "cross-browser" || exit_code=1
            run_tests "security" || exit_code=1
            ;;
        *)
            run_tests "$TEST_MODE" || exit_code=1
            ;;
    esac
    
    # Generate reports regardless of test outcome
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}🎉 All tests passed successfully!${NC}"
    else
        echo -e "${YELLOW}⚠️ Some tests failed, but generating reports...${NC}"
    fi
    
    echo -e "${BLUE}📊 Generating final reports...${NC}"
    
    # Show test summary
    if [ -f "test-results/FRONTEND_INTEGRATION_SUMMARY.md" ]; then
        echo -e "${BLUE}📋 Test Summary:${NC}"
        head -20 "test-results/FRONTEND_INTEGRATION_SUMMARY.md"
        echo ""
    fi
    
    echo -e "${BLUE}🏁 Frontend Integration Tests Complete${NC}"
    echo "=================================================================="
    
    # Ask user if they want to view the report
    read -p "Would you like to view the HTML report? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        generate_reports
    fi
    
    exit $exit_code
}

# Run main function
main