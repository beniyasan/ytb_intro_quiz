#!/bin/bash

# JWT Authentication Video Recording Demo Script
# This script starts the mock server and runs Playwright video recording tests

echo "🎬 JWT Authentication System - Video Recording Demo"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed or not in PATH"
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed or not in PATH"
    exit 1
fi

# Create test-results directory if it doesn't exist
mkdir -p test-results/videos

print_status "Creating test-results directories..."
mkdir -p test-results/screenshots
mkdir -p test-results/traces
mkdir -p test-results/video-demo-report

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# Install Playwright browsers if needed
print_status "Ensuring Playwright browsers are installed..."
npx playwright install chromium

# Kill any existing server processes
print_status "Cleaning up any existing server processes..."
pkill -f "test-server-simple.js" 2>/dev/null || true
pkill -f "node.*3001" 2>/dev/null || true

# Start the mock authentication server in background
print_status "Starting mock authentication server on port 3001..."
node test-server-simple.js &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Check if server is running
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    print_success "Mock server is running (PID: $SERVER_PID)"
else
    print_error "Failed to start mock server"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

# Function to cleanup on script exit
cleanup() {
    print_status "Cleaning up..."
    kill $SERVER_PID 2>/dev/null || true
    print_success "Cleanup completed"
}

# Set trap to cleanup on script exit
trap cleanup EXIT

# Run the video recording tests
print_status "Running JWT Authentication Video Recording Demo..."
print_warning "Browser will open in headed mode for video recording"
print_warning "Do not close the browser window during recording"

echo ""
echo "🎥 Starting Video Recording Tests..."
echo "📋 Tests will run:"
echo "   1. Complete JWT Authentication Flow (45+ seconds)"
echo "   2. JWT System Overview (8 seconds)"
echo ""

# Run Playwright tests with video recording configuration
npx playwright test tests/jwt-video-recording.spec.ts --config=playwright.video.config.ts --headed

TEST_EXIT_CODE=$?

# Check test results
if [ $TEST_EXIT_CODE -eq 0 ]; then
    print_success "Video recording tests completed successfully!"
    
    echo ""
    echo "📁 Generated Files:"
    echo "==================="
    
    # List video files
    if [ -d "test-results" ]; then
        echo ""
        echo "📹 Video Files:"
        find test-results -name "*.webm" -o -name "*.mp4" | while read -r file; do
            if [ -f "$file" ]; then
                size=$(ls -lh "$file" | awk '{print $5}')
                echo "   📼 $file ($size)"
            fi
        done
        
        echo ""
        echo "📸 Screenshots:"
        find test-results -name "*.png" | while read -r file; do
            if [ -f "$file" ]; then
                size=$(ls -lh "$file" | awk '{print $5}')
                echo "   🖼️  $file ($size)"
            fi
        done
        
        echo ""
        echo "📊 Reports:"
        find test-results -name "*.html" -o -name "*.json" | while read -r file; do
            if [ -f "$file" ]; then
                size=$(ls -lh "$file" | awk '{print $5}')
                echo "   📄 $file ($size)"
            fi
        done
    fi
    
    echo ""
    echo "🎬 Video Demo Summary:"
    echo "====================="
    echo "✅ Server health check demonstrated"
    echo "✅ User registration with validation"
    echo "✅ Secure authentication with JWT"
    echo "✅ Token validation and verification"
    echo "✅ Protected endpoint access"
    echo "✅ Token refresh mechanism"
    echo "✅ Security testing (unauthorized access)"
    echo "✅ User logout and token invalidation"
    echo "✅ Complete authentication lifecycle"
    
    echo ""
    print_success "JWT Authentication Video Demo Complete!"
    print_status "Check the test-results directory for video files and reports"
    
    # Try to open the HTML report
    if [ -f "test-results/video-demo-report/index.html" ]; then
        print_status "Opening test report..."
        if command -v xdg-open &> /dev/null; then
            xdg-open test-results/video-demo-report/index.html &
        elif command -v open &> /dev/null; then
            open test-results/video-demo-report/index.html &
        else
            print_status "Open test-results/video-demo-report/index.html in your browser to view the report"
        fi
    fi
    
else
    print_error "Video recording tests failed with exit code: $TEST_EXIT_CODE"
    echo ""
    echo "🔍 Troubleshooting:"
    echo "  - Check if the mock server is running: curl http://localhost:3001/api/health"
    echo "  - Verify Playwright browsers are installed: npx playwright install"
    echo "  - Check the test output above for specific error messages"
    echo "  - Ensure no other services are running on port 3001"
fi

exit $TEST_EXIT_CODE