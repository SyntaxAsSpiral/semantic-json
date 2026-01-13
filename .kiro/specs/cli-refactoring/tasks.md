# Implementation Plan: CLI Refactoring

## Overview

This implementation plan breaks down the refactoring of `cli/canvas-compile.mjs` into discrete, incremental steps. Each task builds on previous work and maintains backward compatibility throughout the process.

## Tasks

- [x] 1. Set up shared utilities module
  - Extract common utility functions from the monolithic file
  - Create `cli/src/shared.mjs` with file I/O, data validation, and color utilities
  - Ensure all utilities are properly exported and documented
  - _Requirements: 2.5, 4.3_

- [x] 1.1 Write unit tests for shared utilities
  - Test file I/O functions with various input types
  - Test data validation and normalization functions
  - Test color manipulation utilities
  - _Requirements: 4.5_

- [x] 2. Create export module
  - [x] 2.1 Extract metadata stripping functionality
    - Move `stripCanvasMetadata` function to `cli/src/exporter.mjs`
    - Extract edge processing and embedding logic
    - Import shared utilities as needed
    - _Requirements: 2.3_

  - [x] 2.2 Write property test for metadata stripping
    - **Property 1: Metadata stripping preserves semantic content**
    - **Validates: Requirements 2.3**

  - [x] 2.3 Write unit tests for export module
    - Test edge processing and node embedding
    - Test various metadata stripping scenarios
    - _Requirements: 4.5_

- [x] 3. Create import module
  - [x] 3.1 Extract JSON/JSONL import functionality
    - Move all import functions to `cli/src/importer.mjs`
    - Extract color generation and layout algorithms
    - Import shared utilities as needed
    - _Requirements: 2.2_

  - [x] 3.2 Write property test for import consistency
    - **Property 2: Import then export preserves data structure**
    - **Validates: Requirements 2.2**

  - [x] 3.3 Write unit tests for import module
    - Test JSON to Canvas conversion
    - Test JSONL to Canvas conversion with grid layout
    - Test pure Canvas data import
    - _Requirements: 4.5_

- [x] 4. Create compilation module
  - [x] 4.1 Extract Canvas compilation functionality
    - Move `compileCanvasAll` and sorting functions to `cli/src/compiler.mjs`
    - Extract flow topology and hierarchy building logic
    - Import shared utilities as needed
    - _Requirements: 2.1_

  - [x] 4.2 Write property test for compilation consistency
    - **Property 3: Compilation produces deterministic output**
    - **Validates: Requirements 2.1**

  - [x] 4.3 Write unit tests for compilation module
    - Test node and edge sorting algorithms
    - Test flow topology analysis
    - Test hierarchical structure processing
    - _Requirements: 4.5_

- [ ] 5. Checkpoint - Ensure all modules are working independently
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Create unified entrypoint
  - [x] 6.1 Create main CLI interface
    - Create `cli/index.mjs` with argument parsing and usage help
    - Implement delegation logic to appropriate modules
    - Maintain exact same command-line interface as original
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 6.2 Write property test for CLI compatibility
    - **Property 4: Refactored CLI produces identical output to original**
    - **Validates: Requirements 1.1, 1.2, 1.3**

  - [x] 6.3 Write property test for argument processing
    - **Property 5: Argument parsing behaves identically to original**
    - **Validates: Requirements 1.4, 3.3**

- [x] 7. Integration and validation
  - [x] 7.1 Wire all modules together
    - Connect entrypoint to all modules
    - Ensure proper error propagation and handling
    - Test coordination between modules
    - _Requirements: 3.4, 3.5_

  - [x] 7.2 Write integration tests
    - Test end-to-end CLI functionality
    - Test error handling and exit codes
    - Test help output and usage messages
    - _Requirements: 1.5, 3.5_

- [ ] 8. Backward compatibility validation
  - [ ] 8.1 Run comparison tests against original CLI
    - Test all existing test files with both versions
    - Compare outputs byte-for-byte
    - Verify identical error messages and exit codes
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

  - [ ] 8.2 Write property test for performance preservation
    - **Property 6: Performance characteristics are preserved**
    - **Validates: Requirements 4.4**

- [ ] 9. Final checkpoint - Ensure complete backward compatibility
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The original `cli/canvas-compile.mjs` is kept for comparison testing until validation is complete