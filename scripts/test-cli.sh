#!/bin/bash

# Script to run CLI tests in isolation
# This prevents mock interference with other test suites

echo "🧪 Running CLI tests in isolation..."
echo "=====================================\n"

# Run only the isolated CLI tests
bun test test/cli/commands-isolated.test.ts --coverage

echo "\n✅ CLI tests completed!"
echo "Note: CLI tests are run separately to prevent mock interference with other test suites."