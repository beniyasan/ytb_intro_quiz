#!/bin/bash

# JWT Authentication Headless Video Recording Demo Script
# This script works in environments without GUI dependencies

echo "🎬 JWT Authentication System - Headless Video Recording Demo"
echo "============================================================"

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

# Check dependencies
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed or not in PATH"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed or not in PATH"
    exit 1
fi

# Create necessary directories
print_status "Setting up test environment..."
mkdir -p test-results/{videos,screenshots,traces,headless-video-report}

# Install dependencies
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# Try to install Playwright browsers (skip if fails)
print_status "Installing Playwright browsers (headless mode)..."
npx playwright install chromium 2>/dev/null || {
    print_warning "Browser installation had issues, but headless mode may still work"
}

# Clean up existing processes
print_status "Cleaning up existing server processes..."
pkill -f "test-server-simple.js" 2>/dev/null || true
pkill -f "node.*3001" 2>/dev/null || true
sleep 2

# Start the mock server
print_status "Starting mock authentication server on port 3001..."
node test-server-simple.js &
SERVER_PID=$!

# Wait for server to start
sleep 4

# Check if server is running
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    print_success "Mock authentication server is running (PID: $SERVER_PID)"
    print_status "Server endpoints available at http://localhost:3001/api/"
else
    print_error "Failed to start mock server"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

# Cleanup function
cleanup() {
    print_status "Shutting down mock server..."
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
    print_success "Cleanup completed"
}

# Set cleanup trap
trap cleanup EXIT

# Run the headless video recording test
print_status "Starting JWT Authentication Headless Video Recording..."
print_warning "Recording will run in headless mode (no visible browser)"
print_warning "Video recording will capture all authentication steps"

echo ""
echo "🎥 Recording JWT Authentication Demo..."
echo "📋 Demo includes:"
echo "   1. Server health check"
echo "   2. User registration with validation"
echo "   3. Secure user authentication" 
echo "   4. JWT token validation"
echo "   5. Protected endpoint access"
echo "   6. Token refresh mechanism"
echo "   7. Security vulnerability testing"
echo "   8. User logout process"
echo "   9. Token invalidation verification"
echo ""
echo "⏱️  Expected duration: ~1 minute"
echo ""

# Run the test with headless video configuration
npx playwright test tests/jwt-headless-video.spec.ts --config=playwright.headless-video.config.ts

TEST_EXIT_CODE=$?

# Analyze results
echo ""
echo "📊 Test Results Analysis:"
echo "========================"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    print_success "Headless video recording completed successfully!"
    
    # List generated files
    echo ""
    echo "📁 Generated Files:"
    echo "==================="
    
    if [ -d "test-results" ]; then
        echo ""
        echo "📹 Video Files:"
        find test-results -name "*.webm" -o -name "*.mp4" | sort | while read -r file; do
            if [ -f "$file" ]; then
                size=$(ls -lh "$file" | awk '{print $5}')
                echo "   🎬 $file ($size)"
            fi
        done
        
        echo ""
        echo "📸 Screenshots:"
        find test-results -name "*.png" | sort | while read -r file; do
            if [ -f "$file" ]; then
                size=$(ls -lh "$file" | awk '{print $5}')
                echo "   🖼️  $file ($size)"
            fi
        done
        
        echo ""
        echo "📄 Reports & Traces:"
        find test-results -name "*.html" -o -name "*.json" -o -name "*.zip" | sort | while read -r file; do
            if [ -f "$file" ]; then
                size=$(ls -lh "$file" | awk '{print $5}')
                echo "   📋 $file ($size)"
            fi
        done
    fi
    
    # Check for video files specifically
    VIDEO_COUNT=$(find test-results -name "*.webm" -o -name "*.mp4" 2>/dev/null | wc -l)
    if [ $VIDEO_COUNT -gt 0 ]; then
        print_success "Video recording successful! Found $VIDEO_COUNT video file(s)"
    else
        print_warning "No video files found - this may be normal in some environments"
    fi
    
    echo ""
    echo "🎯 Demo Coverage Summary:"
    echo "========================"
    echo "✅ Complete JWT authentication lifecycle"
    echo "✅ Token generation, validation, and refresh"
    echo "✅ Protected endpoint security testing"
    echo "✅ Unauthorized access prevention"
    echo "✅ Secure logout and token invalidation"
    echo "✅ Production-ready security features"
    
    echo ""
    print_success "JWT Authentication System Demo Complete!"
    
    # Try to show the HTML report if available
    if [ -f "test-results/headless-video-report/index.html" ]; then
        print_status "HTML report generated at: test-results/headless-video-report/index.html"
        
        # Try to open report (works on different systems)
        if command -v xdg-open &> /dev/null; then
            xdg-open test-results/headless-video-report/index.html & 2>/dev/null
        elif command -v open &> /dev/null; then
            open test-results/headless-video-report/index.html & 2>/dev/null
        fi
    fi
    
    echo ""
    echo "🎬 Video Recording Details:"
    echo "  • Format: WebM/MP4 (depending on browser support)"
    echo "  • Resolution: 1920x1080"
    echo "  • Shows complete authentication flow"
    echo "  • Includes all API interactions"
    echo "  • Demonstrates security features"
    
else
    print_error "Headless video recording failed with exit code: $TEST_EXIT_CODE"
    
    echo ""
    echo "🔧 Troubleshooting Guide:"
    echo "========================"
    echo "1. Check server connectivity:"
    echo "   curl http://localhost:3001/api/health"
    echo ""
    echo "2. Verify Playwright installation:"
    echo "   npx playwright --version"
    echo ""
    echo "3. Check browser dependencies:"
    echo "   npx playwright install chromium"
    echo ""
    echo "4. Review error logs above for specific issues"
    echo ""
    echo "5. Ensure port 3001 is not in use by other services"
    
    # Show any error files that might exist
    if [ -d "test-results" ]; then
        echo ""
        echo "📄 Error logs and traces available in test-results/"
        find test-results -name "*.zip" -o -name "*.log" 2>/dev/null | head -5 | while read -r file; do
            echo "   📋 $file"
        done
    fi
fi

echo ""
print_status "Demo script completed with exit code: $TEST_EXIT_CODE"

exit $TEST_EXIT_CODE