#!/bin/bash

# Complete JWT Authentication Demo with Video Recording Guide
# This script provides a working demonstration and video recording instructions

echo "🔐 JWT Authentication System - Complete Demo & Video Guide"
echo "=========================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Print functions
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

print_highlight() {
    echo -e "${MAGENTA}[HIGHLIGHT]${NC} $1"
}

# Check dependencies
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Run this script from the project root."
        exit 1
    fi
    
    if [ ! -d "node_modules" ]; then
        print_status "Installing dependencies..."
        npm install
    fi
    
    print_success "All dependencies are ready"
}

# Setup directories
setup_environment() {
    print_status "Setting up test environment..."
    mkdir -p test-results/{videos,screenshots,reports}
    print_success "Environment setup complete"
}

# Clean up processes
cleanup_processes() {
    print_status "Cleaning up existing processes..."
    pkill -f "test-server-simple.js" 2>/dev/null || true
    pkill -f "node.*3001" 2>/dev/null || true
    sleep 2
}

# Start authentication server
start_server() {
    print_status "Starting JWT Authentication Server..."
    
    if ! node test-server-simple.js &>/dev/null &
    then
        print_error "Failed to start authentication server"
        exit 1
    fi
    
    SERVER_PID=$!
    print_success "Authentication server started (PID: $SERVER_PID)"
    
    # Wait for server to be ready
    print_status "Waiting for server to be ready..."
    for i in {1..10}; do
        if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
            print_success "Server is ready and responding"
            return 0
        fi
        sleep 1
    done
    
    print_error "Server failed to start properly"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
}

# Run the JWT demo
run_jwt_demo() {
    print_highlight "Starting JWT Authentication System Demonstration"
    echo ""
    echo "📋 This demo will cover:"
    echo "  1. ✅ Server Health Check"
    echo "  2. 👤 User Registration" 
    echo "  3. 🔑 User Authentication"
    echo "  4. ✅ JWT Token Validation"
    echo "  5. 🛡️  Protected Endpoint Access"
    echo "  6. 🔄 Token Refresh Mechanism"
    echo "  7. 🔒 Security Vulnerability Testing"
    echo "  8. 🚪 User Logout Process"
    echo "  9. 🚫 Token Invalidation Verification"
    echo ""
    echo "⏱️  Expected duration: ~20 seconds"
    echo ""
    
    read -p "Press Enter to start the demonstration..."
    
    # Run the demonstration script
    node jwt-demo-script.js
    DEMO_EXIT_CODE=$?
    
    if [ $DEMO_EXIT_CODE -eq 0 ]; then
        print_success "JWT Authentication Demo completed successfully!"
    else
        print_error "Demo failed with exit code: $DEMO_EXIT_CODE"
        return $DEMO_EXIT_CODE
    fi
}

# Show generated files
show_results() {
    echo ""
    print_highlight "Generated Files and Results"
    echo "==========================="
    
    if [ -d "test-results" ]; then
        echo ""
        echo "📊 Reports:"
        find test-results -name "*.json" -o -name "*.html" | while read -r file; do
            if [ -f "$file" ]; then
                size=$(ls -lh "$file" | awk '{print $5}')
                echo "   📄 $file ($size)"
            fi
        done
        
        echo ""
        echo "🎬 Video Recording Guide:"
        if [ -f "jwt-video-recording-script.md" ]; then
            size=$(ls -lh "jwt-video-recording-script.md" | awk '{print $5}')
            echo "   📝 jwt-video-recording-script.md ($size)"
        fi
    fi
    
    echo ""
    print_success "All demonstration files have been generated"
}

# Generate video recording instructions
show_video_instructions() {
    echo ""
    print_highlight "🎥 Video Recording Instructions"
    echo "==============================="
    echo ""
    echo "To create a professional video demonstration:"
    echo ""
    echo "1. 📺 Setup Screen Recording:"
    echo "   • Use OBS Studio, QuickTime, or similar software"
    echo "   • Set resolution to 1920x1080"
    echo "   • Position terminal for clear visibility"
    echo "   • Use readable font size (14pt+)"
    echo ""
    echo "2. 🎬 Record the Demo:"
    echo "   • Start screen recording"
    echo "   • Run: ./run-jwt-demo-complete.sh"
    echo "   • Follow the on-screen demonstration"
    echo "   • Stop recording when demo completes"
    echo ""
    echo "3. 📝 Follow the Script:"
    echo "   • Use jwt-video-recording-script.md for detailed guidance"
    echo "   • Includes narration suggestions"
    echo "   • Provides timeline and talking points"
    echo ""
    echo "4. ✨ Post-Production:"
    echo "   • Add title screens for each section"
    echo "   • Include zoom-ins for important output"
    echo "   • Export as MP4 (1920x1080, 30fps)"
    echo ""
    print_success "Your video will demonstrate all JWT authentication features!"
}

# Cleanup function
cleanup() {
    print_status "Shutting down authentication server..."
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
    print_success "Cleanup completed"
}

# Main execution
main() {
    echo "Starting JWT Authentication System demonstration..."
    echo ""
    
    # Setup
    check_dependencies
    setup_environment
    cleanup_processes
    
    # Set cleanup trap
    trap cleanup EXIT
    
    # Start server
    start_server
    
    # Run demonstration
    run_jwt_demo
    DEMO_RESULT=$?
    
    if [ $DEMO_RESULT -eq 0 ]; then
        # Show results
        show_results
        show_video_instructions
        
        echo ""
        print_success "🎉 JWT Authentication System Demo Complete!"
        print_highlight "Ready for video recording using the generated guide"
        
        # Try to open the HTML report
        if [ -f "test-results/jwt-demo-report.html" ]; then
            print_status "Opening demo report..."
            if command -v xdg-open &> /dev/null; then
                xdg-open test-results/jwt-demo-report.html & 2>/dev/null
            elif command -v open &> /dev/null; then
                open test-results/jwt-demo-report.html & 2>/dev/null
            fi
        fi
        
        # Try to open the video script
        if [ -f "jwt-video-recording-script.md" ]; then
            echo ""
            echo "📖 Video Recording Script Contents:"
            echo "=================================="
            head -20 jwt-video-recording-script.md
            echo ""
            echo "... (see jwt-video-recording-script.md for complete guide)"
        fi
        
    else
        print_error "Demo failed - video recording not ready"
    fi
    
    return $DEMO_RESULT
}

# Execute main function
main "$@"
exit $?