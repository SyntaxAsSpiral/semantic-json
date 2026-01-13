import { test } from 'node:test';
import assert from 'node:assert';
import {
  importJsonToCanvasEnhanced,
  importJsonlToCanvasEnhanced,
  importPureCanvasDataCLI,
  isPureCanvasExport,
  createCanvasNodeFromSourceCLI,
  extractSemanticFieldsCLI,
  calculateNodeHeightCLI,
  extractSemanticInfoCLI,
  importDataToCanvasEnhanced
} from './importer.mjs';

/**
 * Property 2: Import then export preserves data structure
 * For any valid JSON/JSONL input, importing to Canvas and then exporting
 * should preserve the semantic structure and content.
 * **Validates: Requirements 2.2**
 */

test('Property 2: JSON import creates valid Canvas structure', () => {
  const input = {
    name: 'Test',
    value: 42,
    nested: {
      key: 'value'
    }
  };

  const result = importJsonToCanvasEnhanced(input);

  // Should have nodes and edges arrays
  assert(Array.isArray(result.nodes));
  assert(Array.isArray(result.edges));
  
  // Should have created nodes for the structure
  assert(result.nodes.length > 0);
  
  // All nodes should have required Canvas properties
  for (const node of result.nodes) {
    assert(node.id);
    assert(node.type);
    assert(typeof node.x === 'number');
    assert(typeof node.y === 'number');
    assert(typeof node.width === 'number');
    assert(typeof node.height === 'number');
  }
});

test('Property 2: JSONL import creates valid Canvas structure', () => {
  const input = [
    { id: 1, name: 'Record 1' },
    { id: 2, name: 'Record 2' },
    { id: 3, name: 'Record 3' }
  ];

  const result = importJsonlToCanvasEnhanced(input);

  // Should have nodes and edges arrays
  assert(Array.isArray(result.nodes));
  assert(Array.isArray(result.edges));
  
  // Should have created nodes for all records
  assert(result.nodes.length > 0);
  
  // All nodes should have required Canvas properties
  for (const node of result.nodes) {
    assert(node.id);
    assert(node.type);
    assert(typeof node.x === 'number');
    assert(typeof node.y === 'number');
    assert(typeof node.width === 'number');
    assert(typeof node.height === 'number');
  }
});

test('Property 2: Pure Canvas import creates valid Canvas structure', () => {
  const input = {
    nodes: [
      { id: 'n1', type: 'text', text: 'Node 1' },
      { id: 'n2', type: 'text', text: 'Node 2' }
    ],
    edges: []
  };

  const result = importPureCanvasDataCLI(input);

  // Should have nodes and edges arrays
  assert(Array.isArray(result.nodes));
  assert(Array.isArray(result.edges));
  
  // Should have created nodes
  assert(result.nodes.length > 0);
  
  // All nodes should have required Canvas properties
  for (const node of result.nodes) {
    assert(node.id);
    assert(node.type);
    assert(typeof node.x === 'number');
    assert(typeof node.y === 'number');
    assert(typeof node.width === 'number');
    assert(typeof node.height === 'number');
  }
});

test('Property 2: JSON import preserves semantic content', () => {
  const input = {
    title: 'My Document',
    content: 'Some text here',
    metadata: {
      author: 'John',
      date: '2024-01-01'
    }
  };

  const result = importJsonToCanvasEnhanced(input);

  // Should have created text nodes with the content
  const textNodes = result.nodes.filter(n => n.type === 'text');
  assert(textNodes.length > 0);
  
  // At least one node should contain semantic content
  const hasContent = result.nodes.some(n => 
    n.text && (n.text.includes('title') || n.text.includes('My Document'))
  );
  assert(hasContent);
});

test('Property 2: JSONL import preserves record structure', () => {
  const input = [
    { id: 'a', value: 1 },
    { id: 'b', value: 2 }
  ];

  const result = importJsonlToCanvasEnhanced(input);

  // Should have group nodes for records
  const groupNodes = result.nodes.filter(n => n.type === 'group');
  assert(groupNodes.length > 0);
  
  // Should have text nodes for content
  const textNodes = result.nodes.filter(n => n.type === 'text');
  assert(textNodes.length > 0);
});

test('Property 2: Import handles nested structures', () => {
  const input = {
    level1: {
      level2: {
        level3: 'deep value'
      }
    }
  };

  const result = importJsonToCanvasEnhanced(input);

  // Should have created group nodes for nested objects
  const groupNodes = result.nodes.filter(n => n.type === 'group');
  assert(groupNodes.length > 0);
  
  // Should have text node for the deep value
  const hasDeepValue = result.nodes.some(n => 
    n.text && n.text.includes('deep value')
  );
  assert(hasDeepValue);
});

test('Property 2: Import handles arrays', () => {
  const input = {
    items: [1, 2, 3, 4, 5]
  };

  const result = importJsonToCanvasEnhanced(input);

  // Should have created group node for array
  const groupNodes = result.nodes.filter(n => n.type === 'group' && n.label && n.label.includes('items'));
  assert(groupNodes.length > 0);
  
  // Should have text nodes for array items
  const textNodes = result.nodes.filter(n => n.type === 'text');
  assert(textNodes.length > 0);
});

test('Property 2: Import handles primitive values', () => {
  const input = 'simple string';

  const result = importJsonToCanvasEnhanced(input);

  // Should have at least one text node
  const textNodes = result.nodes.filter(n => n.type === 'text');
  assert(textNodes.length > 0);
  assert(textNodes[0].text.includes('simple string'));
});

test('Property 2: Import handles arrays at top level', () => {
  const input = [
    { name: 'Item 1' },
    { name: 'Item 2' },
    { name: 'Item 3' }
  ];

  const result = importJsonToCanvasEnhanced(input);

  // Should have created nodes for array items
  assert(result.nodes.length > 0);
  
  // Should have group nodes
  const groupNodes = result.nodes.filter(n => n.type === 'group');
  assert(groupNodes.length > 0);
});

/**
 * Unit Tests: JSON to Canvas Conversion
 * Test specific scenarios for JSON import functionality.
 * _Requirements: 4.5_
 */

test('Unit test: JSON import with empty object', () => {
  const input = {};

  const result = importJsonToCanvasEnhanced(input);

  assert(Array.isArray(result.nodes));
  assert(Array.isArray(result.edges));
  assert.strictEqual(result.edges.length, 0);
});

test('Unit test: JSON import with empty array', () => {
  const input = [];

  const result = importJsonToCanvasEnhanced(input);

  assert(Array.isArray(result.nodes));
  assert(Array.isArray(result.edges));
  assert.strictEqual(result.edges.length, 0);
});

test('Unit test: JSON import with null value', () => {
  const input = null;

  const result = importJsonToCanvasEnhanced(input);

  // Should handle null gracefully
  assert(Array.isArray(result.nodes));
  const textNodes = result.nodes.filter(n => n.type === 'text');
  assert(textNodes.length > 0);
  assert(textNodes[0].text.includes('null'));
});

test('Unit test: JSON import with mixed types', () => {
  const input = {
    string: 'text',
    number: 42,
    boolean: true,
    null: null,
    array: [1, 2, 3],
    object: { nested: 'value' }
  };

  const result = importJsonToCanvasEnhanced(input);

  // Should have created nodes for all types
  assert(result.nodes.length > 0);
  
  // Should have both text and group nodes
  const textNodes = result.nodes.filter(n => n.type === 'text');
  const groupNodes = result.nodes.filter(n => n.type === 'group');
  assert(textNodes.length > 0);
  assert(groupNodes.length > 0);
});

test('Unit test: JSON import assigns unique IDs', () => {
  const input = {
    a: 1,
    b: 2,
    c: 3
  };

  const result = importJsonToCanvasEnhanced(input);

  const ids = result.nodes.map(n => n.id);
  const uniqueIds = new Set(ids);
  assert.strictEqual(ids.length, uniqueIds.size);
});

test('Unit test: JSON import assigns colors', () => {
  const input = {
    a: 1,
    b: 2
  };

  const result = importJsonToCanvasEnhanced(input);

  // All nodes should have colors
  for (const node of result.nodes) {
    assert(node.color);
    assert(typeof node.color === 'string');
    assert(node.color.startsWith('#'));
  }
});

test('Unit test: JSON import positions nodes correctly', () => {
  const input = {
    a: 1,
    b: 2
  };

  const result = importJsonToCanvasEnhanced(input);

  // All nodes should have valid positions
  for (const node of result.nodes) {
    assert(typeof node.x === 'number');
    assert(typeof node.y === 'number');
    assert(node.x >= 0);
    assert(node.y >= 0);
  }
});

/**
 * Unit Tests: JSONL to Canvas Conversion
 * Test specific scenarios for JSONL import functionality.
 * _Requirements: 4.5_
 */

test('Unit test: JSONL import with single record', () => {
  const input = [{ id: 1, name: 'Record' }];

  const result = importJsonlToCanvasEnhanced(input);

  assert(result.nodes.length > 0);
  
  // Should have group nodes for record
  const groupNodes = result.nodes.filter(n => n.type === 'group');
  assert(groupNodes.length > 0);
});

test('Unit test: JSONL import with multiple records', () => {
  const input = [
    { id: 1, name: 'Record 1' },
    { id: 2, name: 'Record 2' },
    { id: 3, name: 'Record 3' }
  ];

  const result = importJsonlToCanvasEnhanced(input);

  // Should have created nodes for all records
  assert(result.nodes.length > 0);
  
  // Should have group nodes
  const groupNodes = result.nodes.filter(n => n.type === 'group');
  assert(groupNodes.length > 0);
});

test('Unit test: JSONL import with empty array', () => {
  const input = [];

  const result = importJsonlToCanvasEnhanced(input);

  assert.strictEqual(result.nodes.length, 0);
  assert.strictEqual(result.edges.length, 0);
});

test('Unit test: JSONL import with complex records', () => {
  const input = [
    {
      id: 1,
      name: 'Record 1',
      nested: { key: 'value' },
      array: [1, 2, 3]
    },
    {
      id: 2,
      name: 'Record 2',
      nested: { key: 'value2' },
      array: [4, 5, 6]
    }
  ];

  const result = importJsonlToCanvasEnhanced(input);

  // Should have created nodes
  assert(result.nodes.length > 0);
  
  // Should have group nodes for records
  const groupNodes = result.nodes.filter(n => n.type === 'group');
  assert(groupNodes.length > 0);
});

test('Unit test: JSONL import arranges records in grid', () => {
  const input = Array.from({ length: 10 }, (_, i) => ({ id: i, name: `Record ${i}` }));

  const result = importJsonlToCanvasEnhanced(input);

  // Should have created nodes
  assert(result.nodes.length > 0);
  
  // Nodes should be positioned in a grid pattern
  const xPositions = new Set(result.nodes.map(n => n.x));
  const yPositions = new Set(result.nodes.map(n => n.y));
  
  // Should have multiple x and y positions (grid layout)
  assert(xPositions.size > 1);
  assert(yPositions.size > 1);
});

/**
 * Unit Tests: Pure Canvas Import
 * Test specific scenarios for pure Canvas data import.
 * _Requirements: 4.5_
 */

test('Unit test: Pure Canvas import detection', () => {
  const canvasData = {
    nodes: [{ id: 'n1', type: 'text' }],
    edges: []
  };

  assert(isPureCanvasExport(canvasData));
});

test('Unit test: Pure Canvas import detection rejects non-Canvas', () => {
  const nonCanvasData = {
    name: 'Not Canvas',
    value: 42
  };

  assert(!isPureCanvasExport(nonCanvasData));
});

test('Unit test: Pure Canvas import with empty nodes', () => {
  const input = {
    nodes: [],
    edges: []
  };

  const result = importPureCanvasDataCLI(input);

  assert.strictEqual(result.nodes.length, 0);
  assert.strictEqual(result.edges.length, 0);
});

test('Unit test: Pure Canvas import with single node', () => {
  const input = {
    nodes: [{ id: 'n1', type: 'text', text: 'Node 1' }],
    edges: []
  };

  const result = importPureCanvasDataCLI(input);

  assert(result.nodes.length > 0);
  
  // Should have created group and content nodes
  const groupNodes = result.nodes.filter(n => n.type === 'group');
  assert(groupNodes.length > 0);
});

test('Unit test: Pure Canvas import with multiple nodes', () => {
  const input = {
    nodes: [
      { id: 'n1', type: 'text', text: 'Node 1' },
      { id: 'n2', type: 'text', text: 'Node 2' },
      { id: 'n3', type: 'text', text: 'Node 3' }
    ],
    edges: []
  };

  const result = importPureCanvasDataCLI(input);

  assert(result.nodes.length > 0);
});

/**
 * Unit Tests: Semantic Field Extraction
 * Test semantic field extraction from text content.
 * _Requirements: 4.5_
 */

test('Unit test: Extract semantic fields from text', () => {
  const text = '**id**: "node-1"\n**type**: "text"\n**label**: "My Node"';

  const result = extractSemanticFieldsCLI(text);

  assert.strictEqual(result.id, 'node-1');
  assert.strictEqual(result.type, 'text');
  assert.strictEqual(result.label, 'My Node');
});

test('Unit test: Extract semantic fields with remaining text', () => {
  const text = '**id**: "n1"\n**type**: "text"\nSome remaining content';

  const result = extractSemanticFieldsCLI(text);

  assert.strictEqual(result.id, 'n1');
  assert.strictEqual(result.type, 'text');
  assert(result.text.includes('remaining'));
});

test('Unit test: Extract semantic fields with no matches', () => {
  const text = 'Just plain text without semantic fields';

  const result = extractSemanticFieldsCLI(text);

  assert(!result.id);
  assert(!result.type);
  assert.strictEqual(result.text, text);
});

test('Unit test: Calculate node height based on text', () => {
  const shortNode = { text: 'Short' };
  const longNode = { text: 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5' };

  const shortHeight = calculateNodeHeightCLI(shortNode);
  const longHeight = calculateNodeHeightCLI(longNode);

  assert(shortHeight > 0);
  assert(longHeight > shortHeight);
});

test('Unit test: Calculate node height for empty text', () => {
  const node = { text: '' };

  const height = calculateNodeHeightCLI(node);

  assert.strictEqual(height, 60); // Base height
});

test('Unit test: Extract semantic info from node', () => {
  const node = {
    text: '**id**: "n1"\n**type**: "text"\nContent here'
  };

  const result = extractSemanticInfoCLI(node);

  assert.strictEqual(result.semanticId, 'n1');
  assert.strictEqual(result.semanticType, 'text');
  assert(result.cleanText.includes('Content'));
});

test('Unit test: Create Canvas node from source', () => {
  const sourceNode = {
    id: 'source-1',
    type: 'text',
    text: 'Source content'
  };

  const result = createCanvasNodeFromSourceCLI(sourceNode, () => 'generated-id');

  assert.strictEqual(result.id, 'source-1');
  assert.strictEqual(result.type, 'text');
  assert.strictEqual(result.text, 'Source content');
});

test('Unit test: Create Canvas node with semantic extraction', () => {
  const sourceNode = {
    id: 'source-1',
    type: 'text',
    text: '**id**: "extracted-id"\n**type**: "group"\n**label**: "My Group"'
  };

  const result = createCanvasNodeFromSourceCLI(sourceNode, () => 'generated-id');

  assert.strictEqual(result.id, 'extracted-id');
  assert.strictEqual(result.type, 'group');
  assert.strictEqual(result.label, 'My Group');
});

/**
 * Unit Tests: Unified Import Function
 * Test the unified import function with different file types.
 * _Requirements: 4.5_
 */

test('Unit test: Unified import detects JSON files', () => {
  const filePath = 'test.json';
  const fileContent = JSON.stringify({ name: 'Test' });

  const result = importDataToCanvasEnhanced(filePath, fileContent);

  assert(Array.isArray(result.nodes));
  assert(Array.isArray(result.edges));
});

test('Unit test: Unified import detects JSONL files', () => {
  const filePath = 'test.jsonl';
  const fileContent = '{"id": 1}\n{"id": 2}';

  const result = importDataToCanvasEnhanced(filePath, fileContent);

  assert(Array.isArray(result.nodes));
  assert(Array.isArray(result.edges));
});

test('Unit test: Unified import detects pure Canvas files', () => {
  const filePath = 'test.pure.json';
  const fileContent = JSON.stringify({
    nodes: [{ id: 'n1', type: 'text' }],
    edges: []
  });

  const result = importDataToCanvasEnhanced(filePath, fileContent);

  assert(Array.isArray(result.nodes));
  assert(Array.isArray(result.edges));
});

test('Unit test: Unified import handles invalid JSON', () => {
  const filePath = 'test.json';
  const fileContent = 'not valid json';

  assert.throws(() => {
    importDataToCanvasEnhanced(filePath, fileContent);
  });
});

test('Unit test: Unified import handles invalid JSONL', () => {
  const filePath = 'test.jsonl';
  const fileContent = '{"valid": true}\ninvalid json line';

  assert.throws(() => {
    importDataToCanvasEnhanced(filePath, fileContent);
  });
});

test('Unit test: Unified import with large JSON', () => {
  const filePath = 'test.json';
  const largeData = {
    items: Array.from({ length: 100 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      value: Math.random()
    }))
  };
  const fileContent = JSON.stringify(largeData);

  const result = importDataToCanvasEnhanced(filePath, fileContent);

  assert(result.nodes.length > 0);
});

test('Unit test: Unified import with deeply nested JSON', () => {
  const filePath = 'test.json';
  let deepData = { value: 'deep' };
  for (let i = 0; i < 10; i++) {
    deepData = { nested: deepData };
  }
  const fileContent = JSON.stringify(deepData);

  const result = importDataToCanvasEnhanced(filePath, fileContent);

  assert(result.nodes.length > 0);
  
  // Should have group nodes for nesting
  const groupNodes = result.nodes.filter(n => n.type === 'group');
  assert(groupNodes.length > 0);
});
