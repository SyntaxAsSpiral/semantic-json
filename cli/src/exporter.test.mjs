import { test } from 'node:test';
import assert from 'node:assert';
import { stripCanvasMetadata } from './exporter.mjs';

/**
 * Property 1: Metadata stripping preserves semantic content
 * For any Canvas structure with nodes and edges, stripping metadata should preserve
 * all semantic content (id, type, text, file, url, label) while removing spatial
 * and visual metadata (x, y, width, height, color).
 * **Validates: Requirements 2.3**
 */
test('Property 1: Metadata stripping preserves semantic content - text nodes', () => {
  const input = {
    nodes: [
      {
        id: 'node-1',
        type: 'text',
        text: 'Hello World',
        x: 100,
        y: 200,
        width: 250,
        height: 60,
        color: '#FF0000'
      }
    ],
    edges: []
  };

  const result = stripCanvasMetadata(input, {});

  assert.strictEqual(result.nodes.length, 1);
  const node = result.nodes[0];
  
  // Semantic content preserved
  assert.strictEqual(node.id, 'node-1');
  assert.strictEqual(node.type, 'text');
  assert.strictEqual(node.text, 'Hello World');
  
  // Spatial metadata removed
  assert(!('x' in node));
  assert(!('y' in node));
  assert(!('width' in node));
  assert(!('height' in node));
  
  // Visual metadata removed
  assert(!('color' in node));
});

test('Property 1: Metadata stripping preserves semantic content - file nodes', () => {
  const input = {
    nodes: [
      {
        id: 'file-1',
        type: 'file',
        file: 'path/to/document.md',
        x: 50,
        y: 150,
        width: 200,
        height: 100,
        color: '#00FF00'
      }
    ],
    edges: []
  };

  const result = stripCanvasMetadata(input, {});

  assert.strictEqual(result.nodes.length, 1);
  const node = result.nodes[0];
  
  // Semantic content preserved
  assert.strictEqual(node.id, 'file-1');
  assert.strictEqual(node.type, 'file');
  assert.strictEqual(node.file, 'path/to/document.md');
  
  // Spatial and visual metadata removed
  assert(!('x' in node));
  assert(!('y' in node));
  assert(!('color' in node));
});

test('Property 1: Metadata stripping preserves semantic content - link nodes', () => {
  const input = {
    nodes: [
      {
        id: 'link-1',
        type: 'link',
        url: 'https://example.com',
        x: 300,
        y: 400,
        color: '#0000FF'
      }
    ],
    edges: []
  };

  const result = stripCanvasMetadata(input, {});

  assert.strictEqual(result.nodes.length, 1);
  const node = result.nodes[0];
  
  // Semantic content preserved
  assert.strictEqual(node.id, 'link-1');
  assert.strictEqual(node.type, 'link');
  assert.strictEqual(node.url, 'https://example.com');
  
  // Spatial and visual metadata removed
  assert(!('x' in node));
  assert(!('y' in node));
  assert(!('color' in node));
});

test('Property 1: Metadata stripping preserves semantic content - group nodes', () => {
  const input = {
    nodes: [
      {
        id: 'group-1',
        type: 'group',
        label: 'My Group',
        x: 0,
        y: 0,
        width: 500,
        height: 500,
        color: '#FFFF00'
      }
    ],
    edges: []
  };

  const result = stripCanvasMetadata(input, {});

  assert.strictEqual(result.nodes.length, 1);
  const node = result.nodes[0];
  
  // Semantic content preserved
  assert.strictEqual(node.id, 'group-1');
  assert.strictEqual(node.type, 'group');
  assert.strictEqual(node.label, 'My Group');
  
  // Spatial and visual metadata removed
  assert(!('x' in node));
  assert(!('y' in node));
  assert(!('width' in node));
  assert(!('height' in node));
  assert(!('color' in node));
});

/**
 * Property 1 continued: Labeled edges are embedded in nodes
 * When labeled edges exist, they should be embedded into the connected nodes
 * as "from" and "to" properties, preserving the edge label.
 */
test('Property 1: Metadata stripping embeds labeled edges in nodes', () => {
  const input = {
    nodes: [
      { id: 'node-1', type: 'text', text: 'Source' },
      { id: 'node-2', type: 'text', text: 'Target' }
    ],
    edges: [
      {
        id: 'edge-1',
        fromNode: 'node-1',
        toNode: 'node-2',
        label: 'connects to',
        color: '#FF0000'
      }
    ]
  };

  const result = stripCanvasMetadata(input, {});

  assert.strictEqual(result.nodes.length, 2);
  
  // Source node should have "to" property
  const sourceNode = result.nodes[0];
  assert(Array.isArray(sourceNode.to));
  assert.strictEqual(sourceNode.to.length, 1);
  assert.strictEqual(sourceNode.to[0].node, 'node-2');
  assert.strictEqual(sourceNode.to[0].label, 'connects to');
  
  // Target node should have "from" property
  const targetNode = result.nodes[1];
  assert(Array.isArray(targetNode.from));
  assert.strictEqual(targetNode.from.length, 1);
  assert.strictEqual(targetNode.from[0].node, 'node-1');
  assert.strictEqual(targetNode.from[0].label, 'connects to');
  
  // Edge color should be removed from embedded edge
  assert(!('color' in sourceNode.to[0]));
});

/**
 * Property 1 continued: Unlabeled edges handling
 * Unlabeled edges should be preserved in the edges array (unless flow-sorted),
 * with only semantic content (id, fromNode, toNode).
 */
test('Property 1: Metadata stripping preserves unlabeled edges', () => {
  const input = {
    nodes: [
      { id: 'node-1', type: 'text', text: 'A' },
      { id: 'node-2', type: 'text', text: 'B' }
    ],
    edges: [
      {
        id: 'edge-1',
        fromNode: 'node-1',
        toNode: 'node-2',
        color: '#FF0000',
        fromEnd: 'none',
        toEnd: 'arrow'
      }
    ]
  };

  const result = stripCanvasMetadata(input, { stripEdgesWhenFlowSorted: false });

  assert.strictEqual(result.edges.length, 1);
  const edge = result.edges[0];
  
  // Semantic content preserved
  assert.strictEqual(edge.id, 'edge-1');
  assert.strictEqual(edge.fromNode, 'node-1');
  assert.strictEqual(edge.toNode, 'node-2');
  
  // Visual and endpoint metadata removed
  assert(!('color' in edge));
  assert(!('fromEnd' in edge));
  assert(!('toEnd' in edge));
});

/**
 * Property 1 continued: Edge stripping with flow sort
 * When flow-sorted, edges should be stripped (empty array) since topology
 * is compiled into node sequence order.
 */
test('Property 1: Metadata stripping strips edges when flow-sorted', () => {
  const input = {
    nodes: [
      { id: 'node-1', type: 'text', text: 'A' },
      { id: 'node-2', type: 'text', text: 'B' }
    ],
    edges: [
      {
        id: 'edge-1',
        fromNode: 'node-1',
        toNode: 'node-2'
      }
    ]
  };

  const result = stripCanvasMetadata(input, { flowSort: true });

  assert.strictEqual(result.edges.length, 0);
});

test('Property 1: Metadata stripping strips edges with stripEdgesWhenFlowSorted', () => {
  const input = {
    nodes: [
      { id: 'node-1', type: 'text', text: 'A' },
      { id: 'node-2', type: 'text', text: 'B' }
    ],
    edges: [
      {
        id: 'edge-1',
        fromNode: 'node-1',
        toNode: 'node-2'
      }
    ]
  };

  const result = stripCanvasMetadata(input, { stripEdgesWhenFlowSorted: true });

  assert.strictEqual(result.edges.length, 0);
});

/**
 * Property 1 continued: Empty input handling
 * Stripping metadata on empty structures should produce empty structures.
 */
test('Property 1: Metadata stripping handles empty nodes', () => {
  const input = {
    nodes: [],
    edges: []
  };

  const result = stripCanvasMetadata(input, {});

  assert.strictEqual(result.nodes.length, 0);
  assert.strictEqual(result.edges.length, 0);
});

test('Property 1: Metadata stripping handles missing nodes/edges', () => {
  const input = {};

  const result = stripCanvasMetadata(input, {});

  assert.strictEqual(result.nodes.length, 0);
  assert.strictEqual(result.edges.length, 0);
});

/**
 * Property 1 continued: Multiple edges per node
 * Nodes can have multiple incoming and outgoing labeled edges.
 */
test('Property 1: Metadata stripping handles multiple edges per node', () => {
  const input = {
    nodes: [
      { id: 'node-1', type: 'text', text: 'Hub' },
      { id: 'node-2', type: 'text', text: 'A' },
      { id: 'node-3', type: 'text', text: 'B' }
    ],
    edges: [
      { id: 'e1', fromNode: 'node-1', toNode: 'node-2', label: 'to A' },
      { id: 'e2', fromNode: 'node-1', toNode: 'node-3', label: 'to B' },
      { id: 'e3', fromNode: 'node-2', toNode: 'node-1', label: 'back' }
    ]
  };

  const result = stripCanvasMetadata(input, {});

  const hubNode = result.nodes[0];
  assert.strictEqual(hubNode.to.length, 2);
  assert.strictEqual(hubNode.from.length, 1);
});


/**
 * Unit Tests: Edge Processing and Node Embedding
 * Test specific scenarios for edge processing and node embedding logic.
 * _Requirements: 4.5_
 */

test('Unit test: Edge processing with mixed labeled and unlabeled edges', () => {
  const input = {
    nodes: [
      { id: 'n1', type: 'text', text: 'A' },
      { id: 'n2', type: 'text', text: 'B' },
      { id: 'n3', type: 'text', text: 'C' }
    ],
    edges: [
      { id: 'e1', fromNode: 'n1', toNode: 'n2', label: 'labeled' },
      { id: 'e2', fromNode: 'n2', toNode: 'n3' }
    ]
  };

  const result = stripCanvasMetadata(input, { stripEdgesWhenFlowSorted: false });

  // Labeled edge should be embedded
  assert(result.nodes[0].to);
  assert.strictEqual(result.nodes[0].to[0].label, 'labeled');
  
  // Unlabeled edge should be in edges array
  assert.strictEqual(result.edges.length, 1);
  assert.strictEqual(result.edges[0].id, 'e2');
});

test('Unit test: Node embedding preserves all semantic fields', () => {
  const input = {
    nodes: [
      {
        id: 'text-node',
        type: 'text',
        text: 'Content',
        x: 100,
        y: 200,
        color: '#FF0000'
      },
      {
        id: 'file-node',
        type: 'file',
        file: 'doc.md',
        x: 300,
        y: 400,
        color: '#00FF00'
      },
      {
        id: 'link-node',
        type: 'link',
        url: 'https://example.com',
        x: 500,
        y: 600,
        color: '#0000FF'
      },
      {
        id: 'group-node',
        type: 'group',
        label: 'Group',
        x: 0,
        y: 0,
        width: 1000,
        height: 1000,
        color: '#FFFF00'
      }
    ],
    edges: []
  };

  const result = stripCanvasMetadata(input, {});

  // Text node
  assert.strictEqual(result.nodes[0].text, 'Content');
  assert(!('x' in result.nodes[0]));
  
  // File node
  assert.strictEqual(result.nodes[1].file, 'doc.md');
  assert(!('x' in result.nodes[1]));
  
  // Link node
  assert.strictEqual(result.nodes[2].url, 'https://example.com');
  assert(!('x' in result.nodes[2]));
  
  // Group node
  assert.strictEqual(result.nodes[3].label, 'Group');
  assert(!('width' in result.nodes[3]));
});

test('Unit test: Metadata stripping with complex edge scenarios', () => {
  const input = {
    nodes: [
      { id: 'hub', type: 'text', text: 'Hub' },
      { id: 'a', type: 'text', text: 'A' },
      { id: 'b', type: 'text', text: 'B' },
      { id: 'c', type: 'text', text: 'C' }
    ],
    edges: [
      { id: 'e1', fromNode: 'hub', toNode: 'a', label: 'to A' },
      { id: 'e2', fromNode: 'hub', toNode: 'b', label: 'to B' },
      { id: 'e3', fromNode: 'a', toNode: 'c', label: 'a to c' },
      { id: 'e4', fromNode: 'b', toNode: 'c', label: 'b to c' },
      { id: 'e5', fromNode: 'c', toNode: 'hub' } // unlabeled
    ]
  };

  const result = stripCanvasMetadata(input, { stripEdgesWhenFlowSorted: false });

  // Hub node should have 2 outgoing labeled edges (no incoming labeled edges)
  const hubNode = result.nodes[0];
  assert.strictEqual(hubNode.to.length, 2);
  assert(!('from' in hubNode)); // No incoming labeled edges
  
  // Node A should have 1 outgoing and 1 incoming
  const aNode = result.nodes[1];
  assert.strictEqual(aNode.to.length, 1);
  assert.strictEqual(aNode.from.length, 1);
  
  // Unlabeled edge should be in edges array
  assert.strictEqual(result.edges.length, 1);
  assert.strictEqual(result.edges[0].fromNode, 'c');
  assert.strictEqual(result.edges[0].toNode, 'hub');
});

test('Unit test: Metadata stripping with undefined optional fields', () => {
  const input = {
    nodes: [
      {
        id: 'node-1',
        type: 'text',
        text: 'Hello',
        file: undefined,
        url: undefined,
        label: undefined,
        x: 100,
        y: 200
      }
    ],
    edges: []
  };

  const result = stripCanvasMetadata(input, {});

  const node = result.nodes[0];
  assert.strictEqual(node.text, 'Hello');
  assert(!('file' in node));
  assert(!('url' in node));
  assert(!('label' in node));
});

test('Unit test: Metadata stripping preserves node type', () => {
  const input = {
    nodes: [
      { id: 'n1', type: 'text', text: 'Text' },
      { id: 'n2', type: 'file', file: 'doc.md' },
      { id: 'n3', type: 'link', url: 'https://example.com' },
      { id: 'n4', type: 'group', label: 'Group' }
    ],
    edges: []
  };

  const result = stripCanvasMetadata(input, {});

  assert.strictEqual(result.nodes[0].type, 'text');
  assert.strictEqual(result.nodes[1].type, 'file');
  assert.strictEqual(result.nodes[2].type, 'link');
  assert.strictEqual(result.nodes[3].type, 'group');
});

test('Unit test: Metadata stripping with edge label containing special characters', () => {
  const input = {
    nodes: [
      { id: 'n1', type: 'text', text: 'A' },
      { id: 'n2', type: 'text', text: 'B' }
    ],
    edges: [
      {
        id: 'e1',
        fromNode: 'n1',
        toNode: 'n2',
        label: 'connects → with special chars: @#$%'
      }
    ]
  };

  const result = stripCanvasMetadata(input, {});

  assert.strictEqual(result.nodes[0].to[0].label, 'connects → with special chars: @#$%');
});

test('Unit test: Metadata stripping with node IDs requiring normalization', () => {
  const input = {
    nodes: [
      { id: '  node-1  ', type: 'text', text: 'A' },
      { id: '  node-2  ', type: 'text', text: 'B' }
    ],
    edges: [
      {
        id: 'e1',
        fromNode: '  node-1  ',
        toNode: '  node-2  ',
        label: 'edge'
      }
    ]
  };

  const result = stripCanvasMetadata(input, {});

  // IDs should be preserved as-is (normalization happens in edge processing)
  assert.strictEqual(result.nodes[0].id, '  node-1  ');
  assert.strictEqual(result.nodes[1].id, '  node-2  ');
  
  // But edge embedding should work correctly with normalized IDs
  assert(result.nodes[0].to);
  assert.strictEqual(result.nodes[0].to[0].node, 'node-2');
});

test('Unit test: Metadata stripping with large number of nodes and edges', () => {
  const nodes = [];
  const edges = [];
  
  // Create 100 nodes
  for (let i = 0; i < 100; i++) {
    nodes.push({
      id: `node-${i}`,
      type: 'text',
      text: `Node ${i}`,
      x: i * 10,
      y: i * 10,
      color: '#FF0000'
    });
  }
  
  // Create 50 edges
  for (let i = 0; i < 50; i++) {
    edges.push({
      id: `edge-${i}`,
      fromNode: `node-${i}`,
      toNode: `node-${(i + 1) % 100}`,
      label: `edge ${i}`
    });
  }
  
  const input = { nodes, edges };
  const result = stripCanvasMetadata(input, { stripEdgesWhenFlowSorted: false });

  assert.strictEqual(result.nodes.length, 100);
  assert.strictEqual(result.edges.length, 0); // All edges are labeled, so embedded
  
  // Verify first node has outgoing edge
  assert(result.nodes[0].to);
  assert.strictEqual(result.nodes[0].to[0].label, 'edge 0');
});

test('Unit test: Metadata stripping with settings variations', () => {
  const input = {
    nodes: [
      { id: 'n1', type: 'text', text: 'A' },
      { id: 'n2', type: 'text', text: 'B' }
    ],
    edges: [
      { id: 'e1', fromNode: 'n1', toNode: 'n2' }
    ]
  };

  // Test with stripEdgesWhenFlowSorted: false
  const result1 = stripCanvasMetadata(input, { stripEdgesWhenFlowSorted: false });
  assert.strictEqual(result1.edges.length, 1);

  // Test with stripEdgesWhenFlowSorted: true
  const result2 = stripCanvasMetadata(input, { stripEdgesWhenFlowSorted: true });
  assert.strictEqual(result2.edges.length, 0);

  // Test with flowSort: true
  const result3 = stripCanvasMetadata(input, { flowSort: true });
  assert.strictEqual(result3.edges.length, 0);

  // Test with both false
  const result4 = stripCanvasMetadata(input, { flowSort: false, stripEdgesWhenFlowSorted: false });
  assert.strictEqual(result4.edges.length, 1);
});
