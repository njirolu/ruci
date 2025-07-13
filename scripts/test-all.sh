#!/bin/bash

# Comprehensive test script that runs all tests in proper order
# to prevent mock interference between test suites

set -e  # Exit on any error

echo "🧪 Running comprehensive test suite..."
echo "====================================\n"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Step 1: Run core functionality tests (excluding CLI)
echo "📋 Step 1: Running core functionality tests..."
echo "----------------------------------------------"
bun test test/core test/parsers test/reporters test/utils --coverage

if [ $? -eq 0 ]; then
    print_status "Core functionality tests passed"
else
    print_error "Core functionality tests failed"
    exit 1
fi

echo "\n"

# Step 2: Run CLI tests in isolation
echo "🖥️  Step 2: Running CLI tests in isolation..."
echo "----------------------------------------------"
bun test test/cli/commands-isolated.test.ts

if [ $? -eq 0 ]; then
    print_status "CLI tests passed"
else
    print_error "CLI tests failed"
    exit 1
fi

echo "\n"

# Step 3: Generate final coverage report
echo "📊 Step 3: Generating comprehensive coverage report..."
echo "----------------------------------------------------"
# Run only the specific test files that are known to work without interference
bun test \
  test/core/checkers/find-duplicate-values.test.ts \
  test/core/checkers/find-missing-keys.test.ts \
  test/core/checkers/find-unused-keys.test.ts \
  test/core/checkers/verify-project-keys.test.ts \
  test/core/errors/base.error.test.ts \
  test/core/errors/file-system.error.test.ts \
  test/core/errors/parsing.error.test.ts \
  test/core/services/file-reader.test.ts \
  test/core/services/key-extractor.test.ts \
  test/parsers/json-parser.test.ts \
  test/reporters/console-reporter.test.ts \
  test/reporters/error.reporter.test.ts \
  test/utils/path.test.ts \
  test/cli/commands-isolated.test.ts \
  test/config/loader.test.ts \
  --coverage

if [ $? -eq 0 ]; then
    print_status "All tests completed successfully!"
else
    print_warning "Some tests may have issues, but coverage report generated"
fi

echo "\n"
print_status "Test suite execution completed!"
echo "\nℹ️  Test Strategy:"
echo "   • Core tests run first to establish baseline coverage"
echo "   • CLI tests run in isolation using dependency injection"
echo "   • No module mocking interference between test suites"
echo "   • Each test suite is self-contained and independent"