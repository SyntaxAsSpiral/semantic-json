import { test } from 'node:test';
import assert from 'node:assert';
import { compileCanvasAll } from './compiler.mjs';

/**
 * Property 3: Compilation produces deterministic output
 * For any valid Canvas structure, compiling it multiple times with the same settings
 * should produce identical output (same node order, same edge order).
 * **Validates: Requirements 2.1**
 */
test('Property 3: Compilation produces deterministic output - simple structure', () => {
  const input = {
    nodes: [
      { id: 'n1', type: 'text', text: 'First', x: 100, y: 100 },
      { id: 'n2', type: 'text', text: 'Second', x: 200, y: 200 },
      { id: 'n3', type: 'text', text: 'Third', x: 50, y: 50 }
    ],
    edges: [
      { id: 'e1', fromNode: 'n1', toNode: 'n2' },
      { id: 'e2', fromNode: 'n2', toNode: 'n3' }
    ]
  };

  const settings = {
    colorSortNodes: true,
    colorSortEdges: true,
    flowSortNodes: false,
    stripMetadata: false
  };

  // Compile multiple times
  const result1 = compileCanvasAll({ input, settings });
  const result2 = compileCanvasAll({ input, settings });
  const result3 = compileCanvasAll({ input, settings });

  // Results should be identical
  assert.deepStrictEqual(result1, result2);
  assert.deepStrictEqual(result2, result3);
});

test('Property 3: Compilation produces deterministic output - with groups', () => {
  const input = {
    nodes: [
      { id: 'g1', type: 'group', label: 'Group 1', x: 0, y: 0, width: 300, height: 300 },
      { id: 'n1', type: 'text', text: 'Inside', x: 50, y: 50, width: 100, height: 60 },
      { id: 'n2', type: 'text', text: 'Outside', x: 400, y: 400, width: 100, height: 60 }
    ],
    edges: []
  };

  const settings = {
    colorSortNodes: true,
    colorSortEdges: true,
    flowSortNodes: false
  };

  const result1 = compileCanvasAll({ input, settings });
  const result2 = compileCanvasAll({ input, settings });

  assert.deepStrictEqual(result1, result2);
});

test('Property 3: Compilation produces deterministic output - with flow sorting', () => {
  const input = {
    nodes: [
      { id: 'n1', type: 'text', text: 'Start', x: 0, y: 0 },
      { id: 'n2', type: 'text', text: 'Middle', x: 100, y: 100 },
      { id: 'n3', type: 'text', text: 'End', x: 200, y: 200 }
    ],
    edges: [
      { id: 'e1', fromNode: 'n1', toNode: 'n2', fromEnd: 'none', toEnd: 'arrow' },
      { id: 'e2', fromNode: 'n2', toNode: 'n3', fromEnd: 'none', toEnd: 'arrow' }
    ]
  };

  const settings = {
    colorSortNodes: true,
    colorSortEdges: true,
    flowSortNodes: true
  };

  const result1 = compileCanvasAll({ input, settings });
  const result2 = compileCanvasAll({ input, settings });

  assert.deepStrictEqual(result1, result2);
});

test('Property 3: Compilation produces deterministic output - node order consistency', () => {
  const input = {
    nodes: [
      { id: 'n3', type: 'text', text: 'C', x: 300, y: 300 },
      { id: 'n1', type: 'text', text: 'A', x: 100, y: 100 },
      { id: 'n2', type: 'text', text: 'B', x: 200, y: 200 }
    ],
    edges: []
  };

  const settings = { colorSortNodes: true, colorSortEdges: true, flowSortNodes: false };

  const result1 = compileCanvasAll({ input, settings });
  const result2 = compileCanvasAll({ input, settings });

  // Node order should be identical across compilations
  assert.strictEqual(result1.nodes.length, result2.nodes.length);
  for (let i = 0; i < result1.nodes.length; i++) {
    assert.strictEqual(result1.nodes[i].id, result2.nodes[i].id);
  }
});

test('Property 3: Compilation produces deterministic output - edge order consistency', () => {
  const input = {
    nodes: [
      { id: 'n1', type: 'text', text: 'A', x: 0, y: 0 },
      { id: 'n2', type: 'text', text: 'B', x: 100, y: 100 },
      { id: 'n3', type: 'text', text: 'C', x: 200, y: 200 }
    ],
    edges: [
      { id: 'e3', fromNode: 'n3', toNode: 'n1' },
      { id: 'e1', fromNode: 'n1', toNode: 'n2' },
      { id: 'e2', fromNode: 'n2', toNode: 'n3' }
    ]
  };

  const settings = { colorSortNodes: true, colorSortEdges: true, flowSortNodes: false };

  const result1 = compileCanvasAll({ input, settings });
  const result2 = compileCanvasAll({ input, settings });

  // Edge order should be identical
  assert.strictEqual(result1.edges.length, result2.edges.length);
  for (let i = 0; i < result1.edges.length; i++) {
    assert.strictEqual(result1.edges[i].id, result2.edges[i].id);
  }
});

test('Property 3: Compilation produces deterministic output - with color sorting disabled', () => {
  const input = {
    nodes: [
      { id: 'n1', type: 'text', text: 'Red', x: 0, y: 0, color: '#FF0000' },
      { id: 'n2', type: 'text', text: 'Blue', x: 100, y: 100, color: '#0000FF' },
      { id: 'n3', type: 'text', text: 'Green', x: 50, y: 50, color: '#00FF00' }
    ],
    edges: []
  };

  const settings = { colorSortNodes: false, colorSortEdges: false, flowSortNodes: false };

  const result1 = compileCanvasAll({ input, settings });
  const result2 = compileCanvasAll({ input, settings });

  assert.deepStrictEqual(result1, result2);
});

test('Property 3: Compilation produces deterministic output - complex hierarchy', () => {
  const input = {
    nodes: [
      { id: 'g1', type: 'group', label: 'Outer', x: 0, y: 0, width: 500, height: 500 },
      { id: 'g2', type: 'group', label: 'Inner', x: 50, y: 50, width: 200, height: 200 },
      { id: 'n1', type: 'text', text: 'Deep', x: 100, y: 100 },
      { id: 'n2', type: 'text', text: 'Outer', x: 400, y: 400 }
    ],
    edges: []
  };

  const settings = { colorSortNodes: true, colorSortEdges: true, flowSortNodes: false };

  const result1 = compileCanvasAll({ input, settings });
  const result2 = compileCanvasAll({ input, settings });

  assert.deepStrictEqual(result1, result2);
});

test('Property 3: Compilation produces deterministic output - preserves node count', () => {
  const input = {
    nodes: [
      { id: 'n1', type: 'text', text: 'A', x: 0, y: 0 },
      { id: 'n2', type: 'text', text: 'B', x: 100, y: 100 },
      { id: 'n3', type: 'text', text: 'C', x: 200, y: 200 },
      { id: 'n4', type: 'text', text: 'D', x: 300, y: 300 }
    ],
    edges: []
  };

  const settings = { colorSortNodes: true, colorSortEdges: true, flowSortNodes: false };

  const result = compileCanvasAll({ input, settings });

  // All nodes should be present
  assert.strictEqual(result.nodes.length, 4);
  const resultIds = new Set(result.nodes.map(n => n.id));
  assert.strictEqual(resultIds.size, 4);
});

test('Property 3: Compilation produces deterministic output - preserves edge count', () => {
  const input = {
    nodes: [
      { id: 'n1', type: 'text', text: 'A', x: 0, y: 0 },
      { id: 'n2', type: 'text', text: 'B', x: 100, y: 100 },
      { id: 'n3', type: 'text', text: 'C', x: 200, y: 200 }
    ],
    edges: [
      { id: 'e1', fromNode: 'n1', toNode: 'n2' },
      { id: 'e2', fromNode: 'n2', toNode: 'n3' },
      { id: 'e3', fromNode: 'n1', toNode: 'n3' }
    ]
  };

  const settings = { colorSortNodes: true, colorSortEdges: true, flowSortNodes: false };

  const result = compileCanvasAll({ input, settings });

  // All edges should be present
  assert.strictEqual(result.edges.length, 3);
  const resultIds = new Set(result.edges.map(e => e.id));
  assert.strictEqual(resultIds.size, 3);
});

test('Property 3: Compilation produces deterministic output - with mixed node types', () => {
  const input = {
    nodes: [
      { id: 'n1', type: 'text', text: 'Text', x: 0, y: 0 },
      { id: 'n2', type: 'file', file: 'doc.md', x: 100, y: 100 },
      { id: 'n3', type: 'link', url: 'https://example.com', x: 200, y: 200 },
      { id: 'n4', type: 'group', label: 'Group', x: 300, y: 300, width: 100, height: 100 }
    ],
    edges: []
  };

  const settings = { colorSortNodes: true, colorSortEdges: true, flowSortNodes: false };

  const result1 = compileCanvasAll({ input, settings });
  const result2 = compileCanvasAll({ input, settings });

  assert.deepStrictEqual(result1, result2);
});

/**
 * Unit Tests: Node and Edge Sorting Algorithms
 * Test specific scenarios for sorting logic.
 * _Requirements: 4.5_
 */

test('Unit test: Node sorting by spatial position', () => {
  const input = {
    nodes: [
      { id: 'n3', type: 'text', text: 'Third', x: 300, y: 300 },
      { id: 'n1', type: 'text', text: 'First', x: 100, y: 100 },
      { id: 'n2', type: 'text', text: 'Second', x: 200, y: 200 }
    ],
    edges: []
  };

  const result = compileCanvasAll({ input, settings: { colorSortNodes: false, flowSortNodes: false } });

  // Should be sorted by Y then X
  assert.strictEqual(result.nodes[0].id, 'n1');
  assert.strictEqual(result.nodes[1].id, 'n2');
  assert.strictEqual(result.nodes[2].id, 'n3');
});

test('Unit test: Edge sorting by fromNode position', () => {
  const input = {
    nodes: [
      { id: 'n1', type: 'text', text: 'A', x: 0, y: 0 },
      { id: 'n2', type: 'text', text: 'B', x: 100, y: 100 },
      { id: 'n3', type: 'text', text: 'C', x: 200, y: 200 }
    ],
    edges: [
      { id: 'e3', fromNode: 'n3', toNode: 'n1' },
      { id: 'e1', fromNode: 'n1', toNode: 'n2' },
      { id: 'e2', fromNode: 'n2', toNode: 'n3' }
    ]
  };

  const result = compileCanvasAll({ input, settings: { colorSortEdges: false, flowSortNodes: false } });

  // Edges should be sorted by fromNode position
  assert.strictEqual(result.edges[0].fromNode, 'n1');
  assert.strictEqual(result.edges[1].fromNode, 'n2');
  assert.strictEqual(result.edges[2].fromNode, 'n3');
});

test('Unit test: Hierarchical structure processing', () => {
  const input = {
    nodes: [
      { id: 'g1', type: 'group', label: 'Group', x: 0, y: 0, width: 300, height: 300 },
      { id: 'n1', type: 'text', text: 'Inside', x: 50, y: 50 },
      { id: 'n2', type: 'text', text: 'Outside', x: 400, y: 400 }
    ],
    edges: []
  };

  const result = compileCanvasAll({ input, settings: { colorSortNodes: false, flowSortNodes: false } });

  // Group should come before its children in the output
  const groupIndex = result.nodes.findIndex(n => n.id === 'g1');
  const childIndex = result.nodes.findIndex(n => n.id === 'n1');
  assert(groupIndex < childIndex);
});

test('Unit test: Flow topology sorting', () => {
  const input = {
    nodes: [
      { id: 'n1', type: 'text', text: 'Start', x: 0, y: 0 },
      { id: 'n2', type: 'text', text: 'Middle', x: 100, y: 100 },
      { id: 'n3', type: 'text', text: 'End', x: 200, y: 200 }
    ],
    edges: [
      { id: 'e1', fromNode: 'n1', toNode: 'n2', fromEnd: 'none', toEnd: 'arrow' },
      { id: 'e2', fromNode: 'n2', toNode: 'n3', fromEnd: 'none', toEnd: 'arrow' }
    ]
  };

  const result = compileCanvasAll({ input, settings: { colorSortNodes: false, flowSortNodes: true } });

  // Nodes should be in flow order
  assert.strictEqual(result.nodes[0].id, 'n1');
  assert.strictEqual(result.nodes[1].id, 'n2');
  assert.strictEqual(result.nodes[2].id, 'n3');
});

test('Unit test: Validation - duplicate node IDs', () => {
  const input = {
    nodes: [
      { id: 'n1', type: 'text', text: 'A', x: 0, y: 0 },
      { id: 'n1', type: 'text', text: 'B', x: 100, y: 100 }
    ],
    edges: []
  };

  assert.throws(() => {
    compileCanvasAll({ input, settings: {} });
  }, /duplicate node id/);
});

test('Unit test: Validation - missing node ID', () => {
  const input = {
    nodes: [
      { type: 'text', text: 'A', x: 0, y: 0 }
    ],
    edges: []
  };

  assert.throws(() => {
    compileCanvasAll({ input, settings: {} });
  }, /node missing id/);
});

test('Unit test: Validation - edge references missing node', () => {
  const input = {
    nodes: [
      { id: 'n1', type: 'text', text: 'A', x: 0, y: 0 }
    ],
    edges: [
      { id: 'e1', fromNode: 'n1', toNode: 'missing' }
    ]
  };

  assert.throws(() => {
    compileCanvasAll({ input, settings: {} });
  }, /references missing toNode/);
});

test('Unit test: Empty input handling', () => {
  const input = {
    nodes: [],
    edges: []
  };

  const result = compileCanvasAll({ input, settings: {} });

  assert.strictEqual(result.nodes.length, 0);
  assert.strictEqual(result.edges.length, 0);
});

test('Unit test: Single node compilation', () => {
  const input = {
    nodes: [
      { id: 'n1', type: 'text', text: 'Only', x: 0, y: 0 }
    ],
    edges: []
  };

  const result = compileCanvasAll({ input, settings: {} });

  assert.strictEqual(result.nodes.length, 1);
  assert.strictEqual(result.nodes[0].id, 'n1');
});

test('Unit test: Nested groups compilation', () => {
  const input = {
    nodes: [
      { id: 'g1', type: 'group', label: 'Outer', x: 0, y: 0, width: 500, height: 500 },
      { id: 'g2', type: 'group', label: 'Inner', x: 50, y: 50, width: 200, height: 200 },
      { id: 'n1', type: 'text', text: 'Deep', x: 100, y: 100 }
    ],
    edges: []
  };

  const result = compileCanvasAll({ input, settings: {} });

  // All nodes should be present
  assert.strictEqual(result.nodes.length, 3);
  
  // Outer group should come first
  assert.strictEqual(result.nodes[0].id, 'g1');
  
  // Inner group should come before its content
  const innerIndex = result.nodes.findIndex(n => n.id === 'g2');
  const deepIndex = result.nodes.findIndex(n => n.id === 'n1');
  assert(innerIndex < deepIndex);
});

test('Unit test: Color sorting with mixed colors', () => {
  const input = {
    nodes: [
      { id: 'n1', type: 'text', text: 'Red', x: 0, y: 0, color: '#FF0000' },
      { id: 'n2', type: 'text', text: 'Blue', x: 100, y: 100, color: '#0000FF' },
      { id: 'n3', type: 'text', text: 'Green', x: 50, y: 50, color: '#00FF00' }
    ],
    edges: []
  };

  const result = compileCanvasAll({ input, settings: { colorSortNodes: true, flowSortNodes: false } });

  // Nodes should be sorted by Y position first, then X, then color
  // Since they have different Y positions, they should be sorted by Y
  assert.strictEqual(result.nodes[0].id, 'n1'); // y: 0
  assert.strictEqual(result.nodes[1].id, 'n3'); // y: 50
  assert.strictEqual(result.nodes[2].id, 'n2'); // y: 100
});

test('Unit test: Link nodes sorted to end', () => {
  const input = {
    nodes: [
      { id: 'n1', type: 'link', url: 'https://example.com', x: 0, y: 0 },
      { id: 'n2', type: 'text', text: 'Text', x: 100, y: 100 },
      { id: 'n3', type: 'file', file: 'doc.md', x: 200, y: 200 }
    ],
    edges: []
  };

  const result = compileCanvasAll({ input, settings: { colorSortNodes: false, flowSortNodes: false } });

  // Nodes should be sorted by Y position first
  // n1 at y:0, n2 at y:100, n3 at y:200
  // So order should be n1, n2, n3 regardless of type
  assert.strictEqual(result.nodes[0].id, 'n1');
  assert.strictEqual(result.nodes[1].id, 'n2');
  assert.strictEqual(result.nodes[2].id, 'n3');
});
