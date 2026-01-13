import { normalizedId, isFiniteNumber, getNodeSortKey, getNodeTypePriority, getNodeColor, getEdgeColor, isDirectionalEdge, isContainedBy, readJson } from './shared.mjs';
import { stripCanvasMetadata } from './exporter.mjs';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Build flow groups from nodes and edges for topology-based sorting.
 * Identifies connected components and calculates topological order within each component.
 */
function buildFlowGroups(nodes, allEdges, nodePositions) {
  // Build node ID set for this scope
  const nodeIdSet = new Set(nodes.map(n => normalizedId(n.id)));

  // Filter edges to only those within this scope
  const scopedEdges = allEdges.filter(e => {
    const from = normalizedId(e?.fromNode);
    const to = normalizedId(e?.toNode);
    return nodeIdSet.has(from) && nodeIdSet.has(to);
  });

  // Build adjacency graph (undirected for component detection)
  const adjacency = new Map();

  // Build directed graph for flow order
  const outgoing = new Map();
  const incoming = new Map();

  for (const node of nodes) {
    const id = normalizedId(node.id);
    adjacency.set(id, new Set());
    outgoing.set(id, new Set());
    incoming.set(id, new Set());
  }

  for (const edge of scopedEdges) {
    if (!isDirectionalEdge(edge)) continue;

    const from = normalizedId(edge.fromNode);
    const to = normalizedId(edge.toNode);

    // Add to component graph (undirected)
    adjacency.get(from)?.add(to);
    adjacency.get(to)?.add(from);

    // Determine direction
    const fromEnd = edge?.fromEnd;
    const toEnd = edge?.toEnd ?? 'arrow'; // default

    if (fromEnd === 'arrow' && toEnd === 'arrow') {
      // Bidirectional: just connect, don't add flow direction
      // Direction inherited from neighbors later
    } else if (fromEnd === 'arrow') {
      // Reverse direction: to -> from
      outgoing.get(to)?.add(from);
      incoming.get(from)?.add(to);
    } else {
      // Forward direction: from -> to (default)
      outgoing.get(from)?.add(to);
      incoming.get(to)?.add(from);
    }
  }

  // Find connected components
  const visited = new Set();
  const components = [];

  for (const [nodeId] of adjacency) {
    if (visited.has(nodeId)) continue;

    const component = new Set();
    const queue = [nodeId];

    while (queue.length > 0) {
      const current = queue.shift();
      if (visited.has(current)) continue;

      visited.add(current);
      component.add(current);

      for (const neighbor of adjacency.get(current) || []) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }

    if (component.size > 1) {
      // Only include multi-node components (actual flow groups)
      components.push(component);
    }
  }

  // For each component, calculate topological order and min position
  const flowGroups = [];

  for (const component of components) {
    // Calculate min position
    let minY = Infinity;
    let minX = Infinity;

    for (const nodeId of component) {
      const pos = nodePositions.get(nodeId);
      const y = isFiniteNumber(pos?.y) ? pos.y : 0;
      const x = isFiniteNumber(pos?.x) ? pos.x : 0;
      if (y < minY || (y === minY && x < minX)) {
        minY = y;
        minX = x;
      }
    }

    // Topological sort (BFS-based level assignment)
    const flowOrder = new Map();
    const inDegree = new Map();

    for (const nodeId of component) {
      let degree = 0;
      for (const source of incoming.get(nodeId) || []) {
        if (component.has(source)) degree++;
      }
      inDegree.set(nodeId, degree);
    }

    const queue = [];
    for (const nodeId of component) {
      if (inDegree.get(nodeId) === 0) {
        queue.push(nodeId);
        flowOrder.set(nodeId, 0);
      }
    }

    while (queue.length > 0) {
      const current = queue.shift();
      const currentDepth = flowOrder.get(current) || 0;

      for (const next of outgoing.get(current) || []) {
        if (!component.has(next)) continue;

        const degree = inDegree.get(next) - 1;
        inDegree.set(next, degree);

        // Update depth to max of incoming depths + 1
        const nextDepth = Math.max(flowOrder.get(next) || 0, currentDepth + 1);
        flowOrder.set(next, nextDepth);

        if (degree === 0) {
          queue.push(next);
        }
      }
    }

    // Handle cycles: nodes without depth get max depth + 1
    for (const nodeId of component) {
      if (!flowOrder.has(nodeId)) {
        const maxDepth = Math.max(...Array.from(flowOrder.values()), 0);
        flowOrder.set(nodeId, maxDepth + 1);
      }
    }

    flowGroups.push({
      nodes: component,
      minY,
      minX,
      flowOrder,
    });
  }

  return flowGroups;
}

/**
 * Sort nodes by spatial position (X, Y) with optional flow topology and color sorting.
 * Handles flow-based sorting when enabled, with fallback to spatial sorting.
 */
function stableSortByXY(nodes, settings, allEdges, nodePositions, isWithinGroup) {
  // Build flow groups if flow sorting is enabled
  let flowGroups = [];
  const nodeToFlowGroup = new Map();

  if (settings?.flowSortNodes && allEdges && nodePositions) {
    flowGroups = buildFlowGroups(nodes, allEdges, nodePositions);

    // Map nodes to their flow groups
    for (const group of flowGroups) {
      for (const nodeId of group.nodes) {
        nodeToFlowGroup.set(nodeId, group);
      }
    }
  }

  nodes.sort((a, b) => {
    const aId = normalizedId(a?.id);
    const bId = normalizedId(b?.id);

    // Flow-based sorting
    if (settings?.flowSortNodes) {
      const aGroup = nodeToFlowGroup.get(aId);
      const bGroup = nodeToFlowGroup.get(bId);

      // If both in flow groups
      if (aGroup && bGroup) {
        // Same group: sort by flow depth (overrides type priority!)
        if (aGroup === bGroup) {
          const aDepth = aGroup.flowOrder.get(aId) || 0;
          const bDepth = bGroup.flowOrder.get(bId) || 0;
          if (aDepth !== bDepth) return aDepth - bDepth;

          // Same depth: sort by spatial position, then color, then content
          const ay = isFiniteNumber(a?.y) ? a.y : 0;
          const by = isFiniteNumber(b?.y) ? b.y : 0;
          if (ay !== by) return ay - by;

          const ax = isFiniteNumber(a?.x) ? a.x : 0;
          const bx = isFiniteNumber(b?.x) ? b.x : 0;
          if (ax !== bx) return ax - bx;

          // Color sorting (optional)
          if (settings?.colorSortNodes !== false) {
            const aColor = getNodeColor(a);
            const bColor = getNodeColor(b);
            if (aColor !== bColor) return aColor.localeCompare(bColor);
          }

          // Content sorting
          return getNodeSortKey(a).localeCompare(getNodeSortKey(b));
        } else {
          // Different groups: sort by group's top-left position
          if (aGroup.minY !== bGroup.minY) return aGroup.minY - bGroup.minY;
          if (aGroup.minX !== bGroup.minX) return aGroup.minX - bGroup.minX;
          // Groups at same position: shouldn't happen, but fall through
        }
      } else if (aGroup && !bGroup) {
        // A in flow group, B isolated: compare A's group position to B's position
        const by = isFiniteNumber(b?.y) ? b.y : 0;
        const bx = isFiniteNumber(b?.x) ? b.x : 0;
        if (aGroup.minY !== by) return aGroup.minY - by;
        if (aGroup.minX !== bx) return aGroup.minX - bx;
        // If positions equal, flow group comes first
        return -1;
      } else if (!aGroup && bGroup) {
        // A isolated, B in flow group
        const ay = isFiniteNumber(a?.y) ? a.y : 0;
        const ax = isFiniteNumber(a?.x) ? a.x : 0;
        if (ay !== bGroup.minY) return ay - bGroup.minY;
        if (ax !== bGroup.minX) return ax - bGroup.minX;
        // If positions equal, flow group comes first
        return 1;
      }
      // Both isolated: fall through to standard sorting
    }

    // Within groups: always use semantic sorting
    if (isWithinGroup) {
      // Sort by type priority (content nodes before link nodes)
      const aPriority = getNodeTypePriority(a);
      const bPriority = getNodeTypePriority(b);
      if (aPriority !== bPriority) return aPriority - bPriority;

      // Sort by color (groups same-colored nodes together) - optional
      if (settings?.colorSortNodes !== false) {
        const aColor = getNodeColor(a);
        const bColor = getNodeColor(b);
        if (aColor !== bColor) return aColor.localeCompare(bColor);
      }

      // Sort by content (semantic)
      return getNodeSortKey(a).localeCompare(getNodeSortKey(b));
    }

    // Spatial sorting (for orphans and groups themselves)
    const ay = isFiniteNumber(a?.y) ? a.y : 0;
    const by = isFiniteNumber(b?.y) ? b.y : 0;
    if (ay !== by) return ay - by;

    const ax = isFiniteNumber(a?.x) ? a.x : 0;
    const bx = isFiniteNumber(b?.x) ? b.x : 0;
    if (ax !== bx) return ax - bx;

    // Sort by type priority (content nodes before link nodes) - only for non-flow nodes
    const aPriority = getNodeTypePriority(a);
    const bPriority = getNodeTypePriority(b);
    if (aPriority !== bPriority) return aPriority - bPriority;

    // Sort by color (groups same-colored nodes together) - optional
    if (settings?.colorSortNodes !== false) {
      const aColor = getNodeColor(a);
      const bColor = getNodeColor(b);
      if (aColor !== bColor) return aColor.localeCompare(bColor);
    }

    // Then by content
    return getNodeSortKey(a).localeCompare(getNodeSortKey(b));
  });
  return nodes;
}

/**
 * Sort edges by topology and spatial position.
 * Prioritizes flow-based ordering when enabled, falls back to spatial sorting.
 */
function stableEdgeSortByTopology(edges, nodePositions, settings, nodes) {
  // Build flow groups if flow sorting is enabled
  let nodeToFlowGroup = new Map();

  if (settings?.flowSortNodes && nodes) {
    const flowGroups = buildFlowGroups(nodes, edges, nodePositions);
    for (const group of flowGroups) {
      for (const nodeId of group.nodes) {
        nodeToFlowGroup.set(nodeId, group);
      }
    }
  }

  edges.sort((a, b) => {
    const aFromId = normalizedId(a?.fromNode);
    const bFromId = normalizedId(b?.fromNode);
    const aToId = normalizedId(a?.toNode);
    const bToId = normalizedId(b?.toNode);

    // Flow-based sorting (if enabled)
    if (settings?.flowSortNodes && nodeToFlowGroup.size > 0) {
      const aFromGroup = nodeToFlowGroup.get(aFromId);
      const bFromGroup = nodeToFlowGroup.get(bFromId);

      // Sort by fromNode flow depth if both in flow groups
      if (aFromGroup && bFromGroup) {
        const aFromDepth = aFromGroup.flowOrder.get(aFromId) ?? Infinity;
        const bFromDepth = bFromGroup.flowOrder.get(bFromId) ?? Infinity;
        if (aFromDepth !== bFromDepth) return aFromDepth - bFromDepth;
      }

      const aToGroup = nodeToFlowGroup.get(aToId);
      const bToGroup = nodeToFlowGroup.get(bToId);

      // Sort by toNode flow depth if both in flow groups
      if (aToGroup && bToGroup) {
        const aToDepth = aToGroup.flowOrder.get(aToId) ?? Infinity;
        const bToDepth = bToGroup.flowOrder.get(bToId) ?? Infinity;
        if (aToDepth !== bToDepth) return aToDepth - bToDepth;
      }
    }

    // Spatial sorting (fallback or primary when flow disabled)
    // Get fromNode positions
    const aFrom = nodePositions.get(aFromId);
    const bFrom = nodePositions.get(bFromId);

    // Sort by fromNode y position
    const afy = isFiniteNumber(aFrom?.y) ? aFrom.y : 0;
    const bfy = isFiniteNumber(bFrom?.y) ? bFrom.y : 0;
    if (afy !== bfy) return afy - bfy;

    // Sort by fromNode x position
    const afx = isFiniteNumber(aFrom?.x) ? aFrom.x : 0;
    const bfx = isFiniteNumber(bFrom?.x) ? bFrom.x : 0;
    if (afx !== bfx) return afx - bfx;

    // Get toNode positions
    const aTo = nodePositions.get(aToId);
    const bTo = nodePositions.get(bToId);

    // Sort by toNode y position
    const aty = isFiniteNumber(aTo?.y) ? aTo.y : 0;
    const bty = isFiniteNumber(bTo?.y) ? bTo.y : 0;
    if (aty !== bty) return aty - bty;

    // Sort by toNode x position
    const atx = isFiniteNumber(aTo?.x) ? aTo.x : 0;
    const btx = isFiniteNumber(bTo?.x) ? bTo.x : 0;
    if (atx !== btx) return atx - btx;

    // Sort by color (groups same-colored edges together) - optional
    if (settings?.colorSortEdges !== false) {
      const aColor = getEdgeColor(a);
      const bColor = getEdgeColor(b);
      if (aColor !== bColor) return aColor.localeCompare(bColor);
    }

    // Fallback to ID for deterministic ordering
    const aid = normalizedId(a?.id);
    const bid = normalizedId(b?.id);
    return aid.localeCompare(bid);
  });
  return edges;
}

/**
 * Build hierarchical structure by detecting parent-child relationships based on containment.
 * Returns a map of parent group IDs to their contained nodes/groups.
 */
function buildHierarchy(nodes) {
  const groups = nodes.filter((n) => n?.type === 'group');
  const nonGroups = nodes.filter((n) => n?.type !== 'group');

  // Map node ID to its immediate parent group
  const parentMap = new Map();

  for (const node of nonGroups) {
    // Find the smallest group that contains this node (innermost parent)
    let parent = null;
    let minArea = Infinity;

    for (const group of groups) {
      if (isContainedBy(node, group)) {
        const area = (group.width || 0) * (group.height || 0);
        if (area < minArea) {
          minArea = area;
          parent = group;
        }
      }
    }

    if (parent) {
      const parentId = normalizedId(parent.id);
      if (!parentMap.has(parentId)) {
        parentMap.set(parentId, []);
      }
      parentMap.get(parentId).push(node);
    }
  }

  // Also detect nested groups
  for (const childGroup of groups) {
    let parent = null;
    let minArea = Infinity;

    for (const parentGroup of groups) {
      if (childGroup.id === parentGroup.id) continue;
      if (isContainedBy(childGroup, parentGroup)) {
        const area = (parentGroup.width || 0) * (parentGroup.height || 0);
        if (area < minArea) {
          minArea = area;
          parent = parentGroup;
        }
      }
    }

    if (parent) {
      const parentId = normalizedId(parent.id);
      if (!parentMap.has(parentId)) {
        parentMap.set(parentId, []);
      }
      parentMap.get(parentId).push(childGroup);
    }
  }

  return parentMap;
}

/**
 * Flatten hierarchical structure into a linear sequence respecting parent-child relationships.
 * Applies semantic sorting within groups and spatial sorting for orphans.
 */
function flattenHierarchical(nodes, parentMap, settings, allEdges, nodePositions) {
  const groups = nodes.filter((n) => n?.type === 'group');
  const nonGroups = nodes.filter((n) => n?.type !== 'group');
  const result = [];
  const processed = new Set();

  function addNodeAndChildren(node) {
    const nodeId = normalizedId(node.id);
    if (processed.has(nodeId)) return;
    processed.add(nodeId);

    result.push(node);

    // If this node is a group, add its children
    if (node.type === 'group' && parentMap.has(nodeId)) {
      const children = parentMap.get(nodeId);
      stableSortByXY(children, settings, allEdges, nodePositions, true);

      // Separate children into groups and non-groups
      const childGroups = children.filter((c) => c?.type === 'group');
      const childNonGroups = children.filter((c) => c?.type !== 'group');

      // Sort subgroups spatially (not semantically)
      stableSortByXY(childGroups, { ...settings, colorSortNodes: false }, allEdges, nodePositions, false);

      // Add non-groups first, then groups (recursively)
      for (const child of childNonGroups) {
        addNodeAndChildren(child);
      }
      for (const child of childGroups) {
        addNodeAndChildren(child);
      }
    }
  }

  // Find root nodes (not contained by any group)
  const rootNodes = nonGroups.filter((n) => {
    const nodeId = normalizedId(n.id);
    for (const [, children] of parentMap.entries()) {
      if (children.some((c) => normalizedId(c.id) === nodeId)) {
        return false;
      }
    }
    return true;
  });

  const rootGroups = groups.filter((g) => {
    const groupId = normalizedId(g.id);
    for (const [, children] of parentMap.entries()) {
      if (children.some((c) => normalizedId(c.id) === groupId)) {
        return false;
      }
    }
    return true;
  });

  // Sort and add root nodes
  stableSortByXY(rootNodes, settings, allEdges, nodePositions, settings?.semanticSortOrphans);
  stableSortByXY(rootGroups, settings, allEdges, nodePositions);

  for (const node of rootNodes) {
    addNodeAndChildren(node);
  }
  for (const group of rootGroups) {
    addNodeAndChildren(group);
  }

  return result;
}

/**
 * Main compilation function: compile Canvas structure to semantic JSON with sorting.
 * Validates input, builds hierarchy, applies sorting algorithms, and returns compiled structure.
 */
export function compileCanvasAll({ input, settings }) {
  const nodes = Array.isArray(input?.nodes) ? input.nodes : [];
  const edges = Array.isArray(input?.edges) ? input.edges : [];

  const nodeIds = new Set();
  const nodePositions = new Map();
  for (const n of nodes) {
    const id = normalizedId(n?.id);
    if (!id) throw new Error('node missing id');
    if (nodeIds.has(id)) throw new Error(`duplicate node id: ${id}`);
    nodeIds.add(id);
    nodePositions.set(id, { x: n?.x, y: n?.y });
  }

  const edgeIds = new Set();
  for (const e of edges) {
    const id = normalizedId(e?.id);
    if (!id) throw new Error('edge missing id');
    if (edgeIds.has(id)) throw new Error(`duplicate edge id: ${id}`);
    edgeIds.add(id);
    const fromNode = normalizedId(e?.fromNode);
    const toNode = normalizedId(e?.toNode);
    if (!fromNode || !toNode) throw new Error(`edge ${id} missing fromNode/toNode`);
    if (!nodeIds.has(fromNode)) throw new Error(`edge ${id} references missing fromNode: ${fromNode}`);
    if (!nodeIds.has(toNode)) throw new Error(`edge ${id} references missing toNode: ${toNode}`);
  }

  const parentMap = buildHierarchy(nodes);
  const outNodes = flattenHierarchical(nodes, parentMap, settings, edges, nodePositions);
  const outEdges = edges.slice();
  stableEdgeSortByTopology(outEdges, nodePositions, settings, nodes);

  return { nodes: outNodes, edges: outEdges };
}

/**
 * Compile a single Canvas file to semantic JSON.
 * Reads input file, applies compilation, optionally strips metadata, and writes output.
 */
export function compileCanvasFile({ inPath, outPath, settings }) {
  const absIn = path.resolve(String(inPath ?? '').trim());
  const input = readJson(absIn);
  const stem = path.basename(absIn).replace(/\.(canvas|json)$/i, '');

  // Default output to same directory as input
  const absOut = String(outPath ?? '').trim() || path.resolve(path.dirname(absIn), `${stem}.json`);

  // Compile to semantic ordering
  let out = compileCanvasAll({ input, settings });

  // Strip Canvas metadata if requested
  if (settings?.stripMetadata) {
    out = stripCanvasMetadata(out, settings);
  }

  const serialized = JSON.stringify(out, null, 2) + '\n';

  fs.writeFileSync(absOut, serialized, 'utf8');

  return {
    inPath: absIn,
    outPath: absOut,
    nodesIn: Array.isArray(input?.nodes) ? input.nodes.length : 0,
    edgesIn: Array.isArray(input?.edges) ? input.edges.length : 0,
    nodesOut: out.nodes.length,
    edgesOut: out.edges.length,
  };
}
