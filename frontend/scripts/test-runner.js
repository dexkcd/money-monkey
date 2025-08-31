#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_TYPES = {
  unit: {
    command: 'npm',
    args: ['run', 'test'],
    description: 'Unit and component tests',
    outputFile: 'test-results/unit-tests.log'
  },
  integration: {
    command: 'npm',
    args: ['run', 'test:e2e'],
    description: 'Integration tests with Playwright',
    outputFile: 'test-results/integration-tests.log'
  },
  accessibility: {
    command: 'npm',
    args: ['run', 'test:accessibility'],
    description: 'Accessibility tests',
    outputFile: 'test-results/accessibility-tests.log'
  },
  visual: {
    command: 'npm',
    args: ['run', 'test:visual'],
    description: 'Visual regression tests',
    outputFile: 'test-results/visual-tests.log'
  },
  coverage: {
    command: 'npm',
    args: ['run', 'test:coverage'],
    description: 'Test coverage report',
    outputFile: 'test-results/coverage.log'
  }
};

// Ensure test results directory exists
const testResultsDir = path.join(__dirname, '..', 'test-results');
if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir, { recursive: true });
}

// Parse command line arguments
const args = process.argv.slice(2);
const testType = args[0];
const runAll = args.includes('--all');
const parallel = args.includes('--parallel');
const verbose = args.includes('--verbose');

// Helper function to run a test
function runTest(type, config) {
  return new Promise((resolve, reject) => {
    console.log(`\n🧪 Running ${config.description}...`);
    
    const startTime = Date.now();
    const child = spawn(config.command, config.args, {
      stdio: verbose ? 'inherit' : 'pipe',
      shell: true,
      cwd: path.join(__dirname, '..')
    });

    let output = '';
    let errorOutput = '';

    if (!verbose) {
      child.stdout?.on('data', (data) => {
        output += data.toString();
      });

      child.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });
    }

    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      const result = {
        type,
        success: code === 0,
        duration,
        output: output + errorOutput,
        exitCode: code
      };

      // Write output to file
      const outputPath = path.join(testResultsDir, config.outputFile);
      const logContent = `
=== ${config.description} ===
Start Time: ${new Date().toISOString()}
Duration: ${duration}ms
Exit Code: ${code}
Success: ${code === 0}

=== OUTPUT ===
${output}

=== ERROR OUTPUT ===
${errorOutput}

=== END ===
`;
      
      fs.writeFileSync(outputPath, logContent);

      if (code === 0) {
        console.log(`✅ ${config.description} completed successfully (${duration}ms)`);
        resolve(result);
      } else {
        console.log(`❌ ${config.description} failed with exit code ${code} (${duration}ms)`);
        if (!verbose) {
          console.log(`Output saved to: ${outputPath}`);
        }
        reject(result);
      }
    });

    child.on('error', (error) => {
      console.error(`❌ Failed to start ${config.description}:`, error.message);
      reject({ type, success: false, error: error.message });
    });
  });
}

// Helper function to run tests in sequence
async function runSequential(tests) {
  const results = [];
  
  for (const [type, config] of tests) {
    try {
      const result = await runTest(type, config);
      results.push(result);
    } catch (result) {
      results.push(result);
      if (!args.includes('--continue-on-failure')) {
        break;
      }
    }
  }
  
  return results;
}

// Helper function to run tests in parallel
async function runParallel(tests) {
  const promises = tests.map(([type, config]) => 
    runTest(type, config).catch(result => result)
  );
  
  return Promise.all(promises);
}

// Main execution function
async function main() {
  console.log('🚀 Frontend Test Runner');
  console.log('========================');

  let testsToRun = [];

  if (runAll) {
    testsToRun = Object.entries(TEST_TYPES);
  } else if (testType && TEST_TYPES[testType]) {
    testsToRun = [[testType, TEST_TYPES[testType]]];
  } else {
    console.log('Available test types:');
    Object.entries(TEST_TYPES).forEach(([type, config]) => {
      console.log(`  ${type}: ${config.description}`);
    });
    console.log('\nUsage:');
    console.log('  node test-runner.js <test-type>');
    console.log('  node test-runner.js --all');
    console.log('  node test-runner.js --all --parallel');
    console.log('  node test-runner.js unit --verbose');
    console.log('  node test-runner.js --all --continue-on-failure');
    process.exit(1);
  }

  const startTime = Date.now();
  let results;

  try {
    if (parallel && testsToRun.length > 1) {
      console.log('Running tests in parallel...');
      results = await runParallel(testsToRun);
    } else {
      console.log('Running tests sequentially...');
      results = await runSequential(testsToRun);
    }
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }

  // Generate summary report
  const totalDuration = Date.now() - startTime;
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log('\n📊 Test Summary');
  console.log('================');
  console.log(`Total Duration: ${totalDuration}ms`);
  console.log(`Tests Run: ${results.length}`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nFailed Tests:');
    results.filter(r => !r.success).forEach(result => {
      console.log(`  - ${result.type}: Exit code ${result.exitCode}`);
    });
  }

  // Write summary to file
  const summaryPath = path.join(testResultsDir, 'test-summary.json');
  const summary = {
    timestamp: new Date().toISOString(),
    totalDuration,
    results,
    successful,
    failed,
    overallSuccess: failed === 0
  };
  
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`\n📄 Detailed results saved to: ${testResultsDir}`);

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⚠️  Test execution interrupted');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Test execution terminated');
  process.exit(143);
});

// Run the main function
main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});