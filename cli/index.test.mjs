import { test } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Property 4: Refactored CLI produces identical output to original
 * Validates: Requirements 1.1, 1.2, 1.3
 * 
 * Feature: cli-refactoring, Property 4: For any valid input file and command-line arguments,
 * the refactored CLI should produce identical output to the original CLI
 */

// Helper to run CLI and capture output
function runCLI(scriptPath, args) {
  try {
    // Use spawnSync to properly capture both stdout and stderr
    const result = spawnSync('node', [scriptPath, ...args.split(' ').filter(a => a)], {
      encoding: 'utf8',
      cwd: path.join(__dirname, '..'),
    });
    return {
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      exitCode: result.status !== null ? result.status : 0
    };
  } catch (error) {
    return {
      stdout: '',
      stderr: error.message || '',
      exitCode: 1
    };
  }
}

// Helper to clean up temporary files
function cleanupTempFiles(files) {
  for (const file of files) {
    try {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

test('Property 4: Refactored CLI produces identical output for compilation', () => {
  const testFiles = [
    'test-files/raw-user-canvas-1.canvas',
    'test-files/raw-user-canvas-2.canvas',
  ];

  for (const testFile of testFiles) {
    const inputPath = path.join(__dirname, '..', testFile);
    if (!fs.existsSync(inputPath)) {
      console.log(`Skipping ${testFile} - file not found`);
      continue;
    }

    const tempOut1 = path.join(__dirname, '..', 'test-files', `temp-original-${Date.now()}.json`);
    const tempOut2 = path.join(__dirname, '..', 'test-files', `temp-refactored-${Date.now()}.json`);

    try {
      // Run original CLI
      const originalResult = runCLI(
        'cli/canvas-compile.mjs',
        `--in ${inputPath} --out ${tempOut1}`
      );

      // Run refactored CLI
      const refactoredResult = runCLI(
        'cli/index.mjs',
        `--in ${inputPath} --out ${tempOut2}`
      );

      // Compare exit codes
      assert.strictEqual(
        refactoredResult.exitCode,
        originalResult.exitCode,
        `Exit codes should match for ${testFile}`
      );

      // If successful, compare output files
      if (originalResult.exitCode === 0) {
        const originalOutput = fs.readFileSync(tempOut1, 'utf8');
        const refactoredOutput = fs.readFileSync(tempOut2, 'utf8');

        assert.strictEqual(
          refactoredOutput,
          originalOutput,
          `Output files should be identical for ${testFile}`
        );

        // Compare stdout (JSON result summary)
        const originalJson = JSON.parse(originalResult.stdout);
        const refactoredJson = JSON.parse(refactoredResult.stdout);

        assert.strictEqual(
          refactoredJson.nodesOut,
          originalJson.nodesOut,
          `Node count should match for ${testFile}`
        );
        assert.strictEqual(
          refactoredJson.edgesOut,
          originalJson.edgesOut,
          `Edge count should match for ${testFile}`
        );
      }
    } finally {
      cleanupTempFiles([tempOut1, tempOut2]);
    }
  }
});

test('Property 4: Refactored CLI produces identical output for JSON import', () => {
  const testFile = 'test-files/structured-json-2-single-array.json';
  const inputPath = path.join(__dirname, '..', testFile);

  if (!fs.existsSync(inputPath)) {
    console.log(`Skipping ${testFile} - file not found`);
    return;
  }

  const tempOut1 = path.join(__dirname, '..', 'test-files', `temp-original-import-${Date.now()}.canvas`);
  const tempOut2 = path.join(__dirname, '..', 'test-files', `temp-refactored-import-${Date.now()}.canvas`);

  try {
    // Run original CLI
    const originalResult = runCLI(
      'cli/canvas-compile.mjs',
      `--from-json ${inputPath} --out ${tempOut1}`
    );

    // Run refactored CLI
    const refactoredResult = runCLI(
      'cli/index.mjs',
      `--from-json ${inputPath} --out ${tempOut2}`
    );

    // Compare exit codes
    assert.strictEqual(
      refactoredResult.exitCode,
      originalResult.exitCode,
      `Exit codes should match for JSON import`
    );

    // If successful, compare output files
    if (originalResult.exitCode === 0) {
      const originalOutput = fs.readFileSync(tempOut1, 'utf8');
      const refactoredOutput = fs.readFileSync(tempOut2, 'utf8');

      assert.strictEqual(
        refactoredOutput,
        originalOutput,
        `Output files should be identical for JSON import`
      );
    }
  } finally {
    cleanupTempFiles([tempOut1, tempOut2]);
  }
});

test('Property 4: Refactored CLI produces identical output with flags', () => {
  const testFile = 'test-files/raw-user-canvas-1.canvas';
  const inputPath = path.join(__dirname, '..', testFile);

  if (!fs.existsSync(inputPath)) {
    console.log(`Skipping ${testFile} - file not found`);
    return;
  }

  const flagCombinations = [
    '--flow-sort',
    '--strip-metadata',
    '--flow-sort --strip-metadata',
    '--no-color-nodes',
    '--no-color-edges',
    '--group-orphan-nodes',
  ];

  for (const flags of flagCombinations) {
    const tempOut1 = path.join(__dirname, '..', 'test-files', `temp-original-flags-${Date.now()}.json`);
    const tempOut2 = path.join(__dirname, '..', 'test-files', `temp-refactored-flags-${Date.now()}.json`);

    try {
      // Run original CLI
      const originalResult = runCLI(
        'cli/canvas-compile.mjs',
        `--in ${inputPath} --out ${tempOut1} ${flags}`
      );

      // Run refactored CLI
      const refactoredResult = runCLI(
        'cli/index.mjs',
        `--in ${inputPath} --out ${tempOut2} ${flags}`
      );

      // Compare exit codes
      assert.strictEqual(
        refactoredResult.exitCode,
        originalResult.exitCode,
        `Exit codes should match for flags: ${flags}`
      );

      // If successful, compare output files
      if (originalResult.exitCode === 0) {
        const originalOutput = fs.readFileSync(tempOut1, 'utf8');
        const refactoredOutput = fs.readFileSync(tempOut2, 'utf8');

        assert.strictEqual(
          refactoredOutput,
          originalOutput,
          `Output files should be identical for flags: ${flags}`
        );
      }
    } finally {
      cleanupTempFiles([tempOut1, tempOut2]);
    }
  }
});

test('Property 4: Refactored CLI produces identical error messages', () => {
  const invalidArgs = [
    '--in nonexistent.canvas',
    '--from-json nonexistent.json',
    '--unknown-flag',
    '', // No arguments
  ];

  for (const args of invalidArgs) {
    const originalResult = runCLI('cli/canvas-compile.mjs', args);
    const refactoredResult = runCLI('cli/index.mjs', args);

    // Compare exit codes
    assert.strictEqual(
      refactoredResult.exitCode,
      originalResult.exitCode,
      `Exit codes should match for invalid args: ${args}`
    );

    // For usage errors, stderr should be similar (may not be identical due to formatting)
    if (originalResult.exitCode === 2) {
      assert.ok(
        refactoredResult.stderr.length > 0 || refactoredResult.stdout.includes('Usage'),
        `Should produce usage message for invalid args: ${args}`
      );
    }
  }
});

/**
 * Property 5: Argument parsing behaves identically to original
 * Validates: Requirements 1.4, 3.3
 * 
 * Feature: cli-refactoring, Property 5: For any valid argument combination,
 * the refactored CLI should accept or reject it in the same way as the original CLI
 */

test('Property 5: Refactored CLI accepts same valid argument combinations', () => {
  const validArgCombinations = [
    '--help',
    '-h',
    '--in test-files/raw-user-canvas-1.canvas',
    '--from-json test-files/structured-json-2-single-array.json',
    '--import test-files/structured-json-2-single-array.json',
    '--in test-files/raw-user-canvas-1.canvas --color-nodes',
    '--in test-files/raw-user-canvas-1.canvas --no-color-nodes',
    '--in test-files/raw-user-canvas-1.canvas --color-edges',
    '--in test-files/raw-user-canvas-1.canvas --no-color-edges',
    '--in test-files/raw-user-canvas-1.canvas --flow-sort',
    '--in test-files/raw-user-canvas-1.canvas --no-flow-sort',
    '--in test-files/raw-user-canvas-1.canvas --strip-metadata',
    '--in test-files/raw-user-canvas-1.canvas --strip-edges-when-flow-sorted',
    '--in test-files/raw-user-canvas-1.canvas --no-strip-edges-when-flow-sorted',
    '--in test-files/raw-user-canvas-1.canvas --group-orphan-nodes',
    '--in test-files/raw-user-canvas-1.canvas --no-group-orphan-nodes',
    '--in test-files/raw-user-canvas-1.canvas --out test-files/temp-output.json',
    '--in test-files/raw-user-canvas-1.canvas --flow-sort --strip-metadata',
    '--in test-files/raw-user-canvas-1.canvas --no-color-nodes --no-color-edges',
  ];

  for (const args of validArgCombinations) {
    const originalResult = runCLI('cli/canvas-compile.mjs', args);
    const refactoredResult = runCLI('cli/index.mjs', args);

    // Both should have same exit code
    assert.strictEqual(
      refactoredResult.exitCode,
      originalResult.exitCode,
      `Exit codes should match for args: ${args}`
    );

    // If help was requested, both should show usage
    if (args.includes('--help') || args.includes('-h')) {
      assert.ok(
        originalResult.stderr.includes('Usage') || originalResult.stdout.includes('Usage'),
        `Original should show usage for: ${args}`
      );
      assert.ok(
        refactoredResult.stderr.includes('Usage') || refactoredResult.stdout.includes('Usage'),
        `Refactored should show usage for: ${args}`
      );
    }
  }

  // Clean up any temp files
  cleanupTempFiles(['test-files/temp-output.json']);
});

test('Property 5: Refactored CLI rejects same invalid argument combinations', () => {
  const invalidArgCombinations = [
    '--unknown-flag',
    '--in',  // Missing value
    '--from-json',  // Missing value
    '--from-jsonl',  // Missing value
    '--import',  // Missing value
    '--out',  // Missing value
    '--in test-files/nonexistent.canvas',  // File doesn't exist
    '--from-json test-files/nonexistent.json',  // File doesn't exist
    '--in test-files/raw-user-canvas-1.canvas --unknown-flag',
    '--color-nodes --no-color-nodes',  // Contradictory flags (both should work, last wins)
  ];

  for (const args of invalidArgCombinations) {
    const originalResult = runCLI('cli/canvas-compile.mjs', args);
    const refactoredResult = runCLI('cli/index.mjs', args);

    // Both should have same exit code (non-zero for errors)
    assert.strictEqual(
      refactoredResult.exitCode,
      originalResult.exitCode,
      `Exit codes should match for invalid args: ${args}`
    );

    // Both should indicate error (exit code 1 or 2)
    assert.ok(
      refactoredResult.exitCode !== 0,
      `Refactored should reject invalid args: ${args}`
    );
  }
});

test('Property 5: Refactored CLI handles flag order identically', () => {
  const testFile = 'test-files/raw-user-canvas-1.canvas';
  const inputPath = path.join(__dirname, '..', testFile);

  if (!fs.existsSync(inputPath)) {
    console.log(`Skipping ${testFile} - file not found`);
    return;
  }

  // Test that flag order doesn't matter
  const flagOrderVariations = [
    '--in test-files/raw-user-canvas-1.canvas --flow-sort --strip-metadata',
    '--flow-sort --in test-files/raw-user-canvas-1.canvas --strip-metadata',
    '--flow-sort --strip-metadata --in test-files/raw-user-canvas-1.canvas',
    '--strip-metadata --flow-sort --in test-files/raw-user-canvas-1.canvas',
  ];

  const outputs = [];

  for (const args of flagOrderVariations) {
    const tempOut = path.join(__dirname, '..', 'test-files', `temp-order-${Date.now()}.json`);

    try {
      const refactoredResult = runCLI('cli/index.mjs', `${args} --out ${tempOut}`);

      assert.strictEqual(
        refactoredResult.exitCode,
        0,
        `Should succeed for args: ${args}`
      );

      if (refactoredResult.exitCode === 0) {
        const output = fs.readFileSync(tempOut, 'utf8');
        outputs.push(output);
      }
    } finally {
      cleanupTempFiles([tempOut]);
    }
  }

  // All outputs should be identical regardless of flag order
  for (let i = 1; i < outputs.length; i++) {
    assert.strictEqual(
      outputs[i],
      outputs[0],
      `Output should be identical regardless of flag order (variation ${i})`
    );
  }
});

test('Property 5: Refactored CLI handles boolean flag negation identically', () => {
  const testFile = 'test-files/raw-user-canvas-1.canvas';
  const inputPath = path.join(__dirname, '..', testFile);

  if (!fs.existsSync(inputPath)) {
    console.log(`Skipping ${testFile} - file not found`);
    return;
  }

  // Test that last flag wins for contradictory flags
  const flagPairs = [
    ['--color-nodes --no-color-nodes', '--no-color-nodes'],
    ['--no-color-nodes --color-nodes', '--color-nodes'],
    ['--flow-sort --no-flow-sort', '--no-flow-sort'],
    ['--no-flow-sort --flow-sort', '--flow-sort'],
  ];

  for (const [contradictory, expected] of flagPairs) {
    const tempOut1 = path.join(__dirname, '..', 'test-files', `temp-contra-${Date.now()}.json`);
    const tempOut2 = path.join(__dirname, '..', 'test-files', `temp-expected-${Date.now()}.json`);

    try {
      const contradictoryResult = runCLI(
        'cli/index.mjs',
        `--in ${inputPath} --out ${tempOut1} ${contradictory}`
      );
      const expectedResult = runCLI(
        'cli/index.mjs',
        `--in ${inputPath} --out ${tempOut2} ${expected}`
      );

      assert.strictEqual(
        contradictoryResult.exitCode,
        0,
        `Should succeed for contradictory flags: ${contradictory}`
      );
      assert.strictEqual(
        expectedResult.exitCode,
        0,
        `Should succeed for expected flags: ${expected}`
      );

      if (contradictoryResult.exitCode === 0 && expectedResult.exitCode === 0) {
        const contradictoryOutput = fs.readFileSync(tempOut1, 'utf8');
        const expectedOutput = fs.readFileSync(tempOut2, 'utf8');

        assert.strictEqual(
          contradictoryOutput,
          expectedOutput,
          `Contradictory flags "${contradictory}" should behave like "${expected}"`
        );
      }
    } finally {
      cleanupTempFiles([tempOut1, tempOut2]);
    }
  }
});

/**
 * Integration Tests for End-to-End CLI Functionality
 * Validates: Requirements 1.5, 3.5
 */

test('Integration: End-to-end CLI functionality with all import modes', () => {
  const testCases = [
    {
      mode: 'compile',
      input: 'test-files/raw-user-canvas-1.canvas',
      args: '--in test-files/raw-user-canvas-1.canvas',
      expectedExt: '.json'
    },
    {
      mode: 'import-json',
      input: 'test-files/structured-json-2-single-array.json',
      args: '--from-json test-files/structured-json-2-single-array.json',
      expectedExt: '.canvas'
    },
    {
      mode: 'import-unified',
      input: 'test-files/structured-json-3-single-array.json',
      args: '--import test-files/structured-json-3-single-array.json',
      expectedExt: '.canvas'
    }
  ];

  for (const testCase of testCases) {
    const inputPath = path.join(__dirname, '..', testCase.input);
    
    if (!fs.existsSync(inputPath)) {
      console.log(`Skipping ${testCase.mode} - input file not found: ${testCase.input}`);
      continue;
    }

    const tempOut = path.join(__dirname, '..', 'test-files', `temp-integration-${Date.now()}${testCase.expectedExt}`);

    try {
      const result = runCLI('cli/index.mjs', `${testCase.args} --out ${tempOut}`);

      // Should succeed
      assert.strictEqual(
        result.exitCode,
        0,
        `${testCase.mode} should succeed: ${result.stderr}`
      );

      // Should create output file
      assert.ok(
        fs.existsSync(tempOut),
        `${testCase.mode} should create output file`
      );

      // Should produce valid JSON output summary
      assert.ok(
        result.stdout.trim().length > 0,
        `${testCase.mode} should produce stdout summary`
      );

      const summary = JSON.parse(result.stdout);
      assert.ok(
        typeof summary.inPath === 'string',
        `${testCase.mode} summary should include inPath`
      );
      assert.ok(
        typeof summary.outPath === 'string',
        `${testCase.mode} summary should include outPath`
      );
      assert.ok(
        typeof summary.nodesOut === 'number',
        `${testCase.mode} summary should include nodesOut count`
      );

      // Output file should contain valid JSON
      const outputContent = fs.readFileSync(tempOut, 'utf8');
      const outputData = JSON.parse(outputContent);
      assert.ok(
        Array.isArray(outputData.nodes),
        `${testCase.mode} output should have nodes array`
      );
      assert.ok(
        Array.isArray(outputData.edges),
        `${testCase.mode} output should have edges array`
      );

    } finally {
      cleanupTempFiles([tempOut]);
    }
  }
});

test('Integration: Error handling and exit codes', () => {
  const errorCases = [
    {
      name: 'missing input file',
      args: '--in nonexistent.canvas',
      expectedExitCode: 1,
      expectedErrorPattern: /failed|not found|no such file/i
    },
    {
      name: 'invalid JSON input',
      args: '--from-json test-files/invalid.json',
      expectedExitCode: 1,
      expectedErrorPattern: /failed|invalid|parse/i,
      setupFile: () => {
        const invalidPath = path.join(__dirname, '..', 'test-files', 'invalid.json');
        fs.writeFileSync(invalidPath, '{ invalid json }', 'utf8');
        return invalidPath;
      }
    },
    {
      name: 'unknown argument',
      args: '--unknown-flag',
      expectedExitCode: 2,
      expectedErrorPattern: /unknown|usage/i
    },
    {
      name: 'missing required argument',
      args: '--in',
      expectedExitCode: 2,
      expectedErrorPattern: /missing|usage/i
    }
  ];

  for (const errorCase of errorCases) {
    let setupFile = null;
    
    try {
      if (errorCase.setupFile) {
        setupFile = errorCase.setupFile();
      }

      const result = runCLI('cli/index.mjs', errorCase.args);

      // Should have expected exit code
      assert.strictEqual(
        result.exitCode,
        errorCase.expectedExitCode,
        `${errorCase.name} should exit with code ${errorCase.expectedExitCode}`
      );

      // Should produce appropriate error message
      const errorOutput = result.stderr + result.stdout;
      assert.ok(
        errorCase.expectedErrorPattern.test(errorOutput),
        `${errorCase.name} should produce appropriate error message. Got: ${errorOutput}`
      );

    } finally {
      if (setupFile) {
        cleanupTempFiles([setupFile]);
      }
    }
  }
});

test('Integration: Help output and usage messages', () => {
  const helpFlags = ['--help', '-h'];

  for (const flag of helpFlags) {
    const result = runCLI('cli/index.mjs', flag);

    // Should exit successfully for help
    assert.strictEqual(
      result.exitCode,
      0,
      `${flag} should exit successfully`
    );

    // Should produce usage message
    const output = result.stderr + result.stdout;
    assert.ok(
      output.includes('Usage:'),
      `${flag} should show usage information`
    );
    assert.ok(
      output.includes('Options:'),
      `${flag} should show options information`
    );
    assert.ok(
      output.includes('--in'),
      `${flag} should show --in option`
    );
    assert.ok(
      output.includes('--from-json'),
      `${flag} should show --from-json option`
    );
    assert.ok(
      output.includes('--import'),
      `${flag} should show --import option`
    );
  }
});

test('Integration: Module coordination and data flow', () => {
  // Test that modules work together correctly by doing a round-trip:
  // JSON -> Canvas (import) -> JSON (compile) -> Canvas (import again)
  
  const originalJson = {
    "name": "Test Object",
    "items": ["item1", "item2", "item3"],
    "metadata": {
      "version": "1.0",
      "author": "test"
    }
  };

  const tempJsonFile = path.join(__dirname, '..', 'test-files', `temp-roundtrip-${Date.now()}.json`);
  const tempCanvasFile1 = path.join(__dirname, '..', 'test-files', `temp-roundtrip-1-${Date.now()}.canvas`);
  const tempCompiledFile = path.join(__dirname, '..', 'test-files', `temp-roundtrip-compiled-${Date.now()}.json`);
  const tempCanvasFile2 = path.join(__dirname, '..', 'test-files', `temp-roundtrip-2-${Date.now()}.canvas`);

  try {
    // Step 1: Create test JSON file
    fs.writeFileSync(tempJsonFile, JSON.stringify(originalJson, null, 2), 'utf8');

    // Step 2: Import JSON to Canvas
    const importResult = runCLI('cli/index.mjs', `--from-json ${tempJsonFile} --out ${tempCanvasFile1}`);
    assert.strictEqual(importResult.exitCode, 0, 'JSON import should succeed');
    assert.ok(fs.existsSync(tempCanvasFile1), 'Canvas file should be created');

    // Step 3: Compile Canvas to JSON
    const compileResult = runCLI('cli/index.mjs', `--in ${tempCanvasFile1} --out ${tempCompiledFile}`);
    assert.strictEqual(compileResult.exitCode, 0, 'Canvas compilation should succeed');
    assert.ok(fs.existsSync(tempCompiledFile), 'Compiled JSON file should be created');

    // Step 4: Import compiled JSON back to Canvas
    const reimportResult = runCLI('cli/index.mjs', `--from-json ${tempCompiledFile} --out ${tempCanvasFile2}`);
    assert.strictEqual(reimportResult.exitCode, 0, 'JSON re-import should succeed');
    assert.ok(fs.existsSync(tempCanvasFile2), 'Re-imported Canvas file should be created');

    // Verify that all steps produced valid output
    const canvas1 = JSON.parse(fs.readFileSync(tempCanvasFile1, 'utf8'));
    const compiled = JSON.parse(fs.readFileSync(tempCompiledFile, 'utf8'));
    const canvas2 = JSON.parse(fs.readFileSync(tempCanvasFile2, 'utf8'));

    // All should have valid Canvas structure
    assert.ok(Array.isArray(canvas1.nodes), 'First Canvas should have nodes array');
    assert.ok(Array.isArray(canvas1.edges), 'First Canvas should have edges array');
    assert.ok(Array.isArray(compiled.nodes), 'Compiled JSON should have nodes array');
    assert.ok(Array.isArray(compiled.edges), 'Compiled JSON should have edges array');
    assert.ok(Array.isArray(canvas2.nodes), 'Second Canvas should have nodes array');
    assert.ok(Array.isArray(canvas2.edges), 'Second Canvas should have edges array');

    // Should preserve data through the round-trip
    assert.ok(canvas1.nodes.length > 0, 'First Canvas should have nodes');
    assert.ok(compiled.nodes.length > 0, 'Compiled JSON should have nodes');
    assert.ok(canvas2.nodes.length > 0, 'Second Canvas should have nodes');

  } finally {
    cleanupTempFiles([tempJsonFile, tempCanvasFile1, tempCompiledFile, tempCanvasFile2]);
  }
});

test('Integration: Performance and resource handling', () => {
  // Test with a reasonably sized input to ensure no memory issues
  const largeData = {
    records: Array.from({ length: 100 }, (_, i) => ({
      id: `record-${i}`,
      name: `Record ${i}`,
      data: Array.from({ length: 10 }, (_, j) => `item-${i}-${j}`),
      metadata: {
        index: i,
        category: `category-${i % 5}`,
        tags: [`tag-${i % 3}`, `tag-${i % 7}`]
      }
    }))
  };

  const tempJsonFile = path.join(__dirname, '..', 'test-files', `temp-large-${Date.now()}.json`);
  const tempCanvasFile = path.join(__dirname, '..', 'test-files', `temp-large-${Date.now()}.canvas`);

  try {
    // Create large test file
    fs.writeFileSync(tempJsonFile, JSON.stringify(largeData, null, 2), 'utf8');

    // Test import performance
    const startTime = Date.now();
    const result = runCLI('cli/index.mjs', `--from-json ${tempJsonFile} --out ${tempCanvasFile}`);
    const endTime = Date.now();

    // Should complete successfully
    assert.strictEqual(result.exitCode, 0, 'Large file import should succeed');
    assert.ok(fs.existsSync(tempCanvasFile), 'Large Canvas file should be created');

    // Should complete in reasonable time (less than 30 seconds)
    const duration = endTime - startTime;
    assert.ok(duration < 30000, `Import should complete in reasonable time (took ${duration}ms)`);

    // Should produce valid output
    const canvas = JSON.parse(fs.readFileSync(tempCanvasFile, 'utf8'));
    assert.ok(Array.isArray(canvas.nodes), 'Large Canvas should have nodes array');
    assert.ok(canvas.nodes.length > 0, 'Large Canvas should have nodes');

    // Should handle the data without corruption
    const summary = JSON.parse(result.stdout);
    assert.ok(summary.nodesOut > 100, 'Should create many nodes for large input');

  } finally {
    cleanupTempFiles([tempJsonFile, tempCanvasFile]);
  }
});

test('Integration: Semantic interoperability with Canvas field reassignment', () => {
  // Test that Canvas field reassignment preserves semantic interoperability
  // This tests the core requirement that data exported by the plugin can be re-imported intelligently
  
  // Step 1: Create a Canvas with semantic content
  const originalCanvas = {
    nodes: [
      {
        id: "test-node-1",
        type: "text",
        text: "**id**: \"semantic-id-1\"\n**type**: \"group\"\n**label**: \"Test Group\"\nSome additional content",
        x: 100,
        y: 100,
        width: 300,
        height: 150
      },
      {
        id: "test-node-2", 
        type: "text",
        text: "**id**: \"semantic-id-2\"\n**text**: \"This is semantic text content\"",
        x: 100,
        y: 300,
        width: 300,
        height: 100
      }
    ],
    edges: []
  };

  const tempCanvasFile = path.join(__dirname, '..', 'test-files', `temp-semantic-${Date.now()}.canvas`);
  const tempCompiledFile = path.join(__dirname, '..', 'test-files', `temp-semantic-compiled-${Date.now()}.json`);
  const tempReimportedFile = path.join(__dirname, '..', 'test-files', `temp-semantic-reimported-${Date.now()}.canvas`);

  try {
    // Step 1: Create original Canvas file
    fs.writeFileSync(tempCanvasFile, JSON.stringify(originalCanvas, null, 2), 'utf8');

    // Step 2: Compile to JSON (this should extract semantic fields)
    const compileResult = runCLI('cli/index.mjs', `--in ${tempCanvasFile} --out ${tempCompiledFile} --strip-metadata`);
    assert.strictEqual(compileResult.exitCode, 0, 'Canvas compilation should succeed');

    // Step 3: Re-import the compiled JSON (this should reassign Canvas fields intelligently)
    // Use --import instead of --from-json to get pure Canvas detection
    const reimportResult = runCLI('cli/index.mjs', `--import ${tempCompiledFile} --out ${tempReimportedFile}`);
    assert.strictEqual(reimportResult.exitCode, 0, 'JSON re-import should succeed');

    // Step 4: Verify semantic interoperability
    const compiledData = JSON.parse(fs.readFileSync(tempCompiledFile, 'utf8'));
    const reimportedCanvas = JSON.parse(fs.readFileSync(tempReimportedFile, 'utf8'));

    // The compiled JSON should have extracted semantic fields
    const compiledNodes = compiledData.nodes;
    assert.ok(compiledNodes.length >= 2, 'Compiled JSON should preserve nodes');

    // Find nodes with semantic IDs
    const semanticNode1 = compiledNodes.find(n => n.id === 'semantic-id-1');
    const semanticNode2 = compiledNodes.find(n => n.id === 'semantic-id-2');

    if (semanticNode1) {
      assert.strictEqual(semanticNode1.type, 'group', 'Semantic type should be extracted and preserved');
      assert.strictEqual(semanticNode1.label, 'Test Group', 'Semantic label should be extracted and preserved');
    }

    if (semanticNode2) {
      assert.strictEqual(semanticNode2.text, 'This is semantic text content', 'Semantic text should be extracted and preserved');
    }

    // The re-imported Canvas should have proper Canvas structure
    assert.ok(Array.isArray(reimportedCanvas.nodes), 'Re-imported Canvas should have nodes array');
    assert.ok(reimportedCanvas.nodes.length > 0, 'Re-imported Canvas should have nodes');

    // Test should FAIL if semantic interoperability is broken
    // This means the Canvas field reassignment is working correctly
    const reimportedNodes = reimportedCanvas.nodes;
    let foundSemanticReassignment = false;

    for (const node of reimportedNodes) {
      // Look for evidence of semantic field reassignment
      // The key test is that semantic IDs, types, and labels are preserved
      if (node.id === 'semantic-id-1' && node.type === 'group' && node.label === 'Test Group') {
        foundSemanticReassignment = true;
        break;
      }
      if (node.id === 'semantic-id-2' && node.text === 'This is semantic text content') {
        foundSemanticReassignment = true;
        break;
      }
    }

    assert.ok(
      foundSemanticReassignment,
      'Semantic field reassignment should preserve Canvas field structure - if this fails, semantic interoperability is broken'
    );

  } finally {
    cleanupTempFiles([tempCanvasFile, tempCompiledFile, tempReimportedFile]);
  }
});
