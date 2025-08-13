#!/bin/bash

# JWT Authentication System Video Demo Script
echo "🎬 Starting JWT Authentication System Video Demo"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

# Create test-results directory if it doesn't exist
mkdir -p test-results
mkdir -p test-results/videos

print_status "Setting up JWT Authentication Demo..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# Install Playwright browsers if not already installed
print_status "Installing Playwright browsers..."
npx playwright install

# Build the TypeScript project
print_status "Building project..."
npm run build

# Start the authentication server in the background
print_status "Starting authentication server on port 3001..."
PORT=3001 npm run dev &
SERVER_PID=$!

# Wait for server to start
print_status "Waiting for server to start..."
sleep 5

# Check if server is running
if curl -s http://localhost:3001/api/health > /dev/null; then
    print_success "Authentication server is running on http://localhost:3001"
else
    print_error "Failed to start authentication server"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

# Run the visual demo tests with video recording
print_status "Running JWT Authentication Visual Demo..."
print_status "This will create video recordings of the authentication flow"

# Run only the visual demo test
npx playwright test jwt-auth-visual-demo.spec.ts --project=chromium --headed

# Check test results
if [ $? -eq 0 ]; then
    print_success "JWT Authentication Demo completed successfully!"
    
    # Find and display video file path
    VIDEO_DIR="test-results"
    VIDEO_FILE=$(find $VIDEO_DIR -name "*.webm" -o -name "*.mp4" | head -1)
    
    if [ -n "$VIDEO_FILE" ]; then
        print_success "Video recording saved to: $VIDEO_FILE"
        print_status "Video file size: $(du -h "$VIDEO_FILE" | cut -f1)"
    else
        print_warning "Video file not found in test-results directory"
        print_status "Checking for video files..."
        find test-results -name "*.webm" -o -name "*.mp4" -o -name "*.mov" | head -5
    fi
    
    # Display screenshot paths
    SCREENSHOTS=$(find test-results -name "*.png" | head -3)
    if [ -n "$SCREENSHOTS" ]; then
        print_success "Screenshots saved:"
        echo "$SCREENSHOTS" | while read -r screenshot; do
            echo "  - $screenshot"
        done
    fi
    
    print_status "Opening Playwright test report..."
    npx playwright show-report &
    
else
    print_error "JWT Authentication Demo failed"
fi

# Stop the server
print_status "Stopping authentication server..."
kill $SERVER_PID 2>/dev/null

print_success "Demo complete! Check the test-results directory for videos and screenshots."
print_status "The video demonstrates:"
print_status "  ✅ Complete JWT authentication flow"
print_status "  ✅ User registration and login"
print_status "  ✅ Token validation and refresh"
print_status "  ✅ Protected endpoint access"
print_status "  ✅ Security features and logout"
print_status "  ✅ Token invalidation verification"

echo ""
print_status "To view the video, use any video player to open:"
find test-results -name "*.webm" -o -name "*.mp4" | head -1