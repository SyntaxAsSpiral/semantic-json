import fs from 'node:fs';
import path from 'node:path';
import { 
  readJson, 
  generateRainbowGradient, 
  generateHierarchicalColors, 
  mutateColor 
} from './shared.mjs';

/**
 * Enhanced JSON import with rainbow coloring for top-level items and hierarchical coloring for nested content.
 * Creates visual scaffolding from pure JSON: objects to groups, arrays to groups, primitives to text nodes.
 */
export function importJsonToCanvasEnhanced(data) {
  const nodes = [];
  let idCounter = 0;
  const generateId = () => `imported-${(idCounter++).toString(16).padStart(16, '0')}`;

  // Check if this is a top-level object with multiple properties or a top-level array
  const isTopLevelObject = typeof data === 'object' && data !== null && !Array.isArray(data);
  const isTopLevelArray = Array.isArray(data);
  
  if (isTopLevelObject) {
    // For top-level objects, treat each property as a separate rainbow-colored section
    const entries = Object.entries(data);
    const rainbowColors = generateRainbowGradient(entries.length);
    
    let currentY = 50;
    
    entries.forEach(([key, value], index) => {
      const baseColor = rainbowColors[index];
      const hierarchicalColors = generateHierarchicalColors(baseColor, 6);
      const context = { x: 50, y: currentY };
      
      // Traverse this property with its own color scheme
      traverseWithColors(value, key, context, 0, hierarchicalColors);
      currentY = context.y + 50; // Add spacing between top-level sections
    });
    
  } else if (isTopLevelArray) {
    // For top-level arrays, treat each item as a separate rainbow-colored section
    const rainbowColors = generateRainbowGradient(data.length);
    
    let currentY = 50;
    
    data.forEach((item, index) => {
      const baseColor = rainbowColors[index];
      const hierarchicalColors = generateHierarchicalColors(baseColor, 6);
      const context = { x: 50, y: currentY };
      
      // Traverse this array item with its own color scheme
      traverseWithColors(item, `[${index}]`, context, 0, hierarchicalColors);
      currentY = context.y + 50; // Add spacing between top-level sections
    });
    
  } else {
    // For primitive top-level values, use single hierarchical coloring
    const baseColor = '#89b4fa'; // Catppuccin blue as base
    const hierarchicalColors = generateHierarchicalColors(baseColor, 6);
    const context = { x: 50, y: 50 };
    
    traverseWithColors(data, null, context, 0, hierarchicalColors);
  }

  // Enhanced traverse function with hierarchical coloring
  function traverseWithColors(value, key, context, depth, hierarchicalColors) {
    const colorIndex = Math.min(depth, hierarchicalColors.length - 1);
    const currentColor = hierarchicalColors[colorIndex];
    
    if (value === null || value === undefined) {
      const displayValue = value === null ? 'null' : 'undefined';
      nodes.push({
        id: generateId(),
        type: 'text',
        text: key !== null ? `**${String(key)}**: ${displayValue}` : displayValue,
        x: context.x,
        y: context.y,
        width: 250,
        height: 60,
        color: currentColor,
      });
      context.y += 80;
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      // Object to Group
      const groupId = generateId();
      const groupStartY = context.y;
      const label = key !== null ? String(key) : 'Object';
      context.y += 40; // Space for group header
      
      const entries = Object.entries(value);
      entries.forEach(([k, v]) => {
        traverseWithColors(v, k, context, depth + 1, hierarchicalColors);
      });
      
      const groupHeight = Math.max(context.y - groupStartY + 20, 100);
      nodes.push({
        id: groupId,
        type: 'group',
        label,
        x: context.x - 10,
        y: groupStartY,
        width: Math.max(600, 300 + depth * 50), // Wider groups for deeper nesting
        height: groupHeight,
        color: currentColor,
      });
      
      context.y += 20; // Space after group
    } else if (Array.isArray(value)) {
      // Array to Group
      const groupId = generateId();
      const groupStartY = context.y;
      const label = key !== null ? `${String(key)} [${value.length}]` : `Array [${value.length}]`;
      context.y += 40; // Space for group header
      
      value.forEach((item, index) => {
        traverseWithColors(item, `[${index}]`, context, depth + 1, hierarchicalColors);
      });
      
      const groupHeight = Math.max(context.y - groupStartY + 20, 100);
      nodes.push({
        id: groupId,
        type: 'group',
        label,
        x: context.x - 10,
        y: groupStartY,
        width: Math.max(600, 300 + depth * 50),
        height: groupHeight,
        color: currentColor,
      });
      
      context.y += 20; // Space after group
    } else {
      // Primitive to Text node
      const valueStr = typeof value === 'string' ? `"${value}"` : 
                      typeof value === 'number' || typeof value === 'boolean' ? String(value) :
                      typeof value === 'object' ? JSON.stringify(value) : 'unknown';
      const displayText = key !== null ? `**${String(key)}**: ${valueStr}` : valueStr;
      
      nodes.push({
        id: generateId(),
        type: 'text',
        text: displayText,
        x: context.x,
        y: context.y,
        width: Math.max(250, Math.min(500, displayText.length * 8 + 50)),
        height: Math.max(60, Math.ceil(displayText.length / 40) * 20 + 40),
        color: currentColor,
      });
      context.y += Math.max(80, Math.ceil(displayText.length / 40) * 20 + 60);
    }
  }

  return { nodes, edges: [] };
}


/**
 * Enhanced JSONL import with rainbow gradient coloring and grid layout.
 * Creates visual scaffolding for multiple JSON objects: each object to group, arranged in a grid.
 * Uses proper node-first placement with groups calculated from actual node positions.
 */
export function importJsonlToCanvasEnhanced(jsonObjects) {
  const groupNodes = []; // Groups go first (bottom layer)
  const contentNodes = []; // Content goes on top
  let idCounter = 0;
  const generateId = () => `imported-${(idCounter++).toString(16).padStart(16, '0')}`;

  // Grid layout configuration
  const recordWidth = 420;  // Width for each record column
  const recordSpacing = 30; // Spacing between records
  const totalRecordWidth = recordWidth + recordSpacing;
  const columnWidth = 180; // Width of each text column within a group
  const columnSpacing = 20; // Space between columns
  const groupPadding = 20; // Breathing room inside groups
  const nodeHeight = 60; // Standard node height
  const nodeSpacing = 10; // Spacing between nodes
  const sectionSpacing = 50; // Extra spacing between logical sections
  const groupSpacing = 25; // Extra spacing after each group
  
  // Calculate grid dimensions - max 4 columns for optimal document scanning
  const maxCols = 4;
  const recordCount = jsonObjects.length;
  
  let cols = Math.min(recordCount, maxCols);
  let rows = Math.ceil(recordCount / cols);

  console.log(`Arranging ${recordCount} records in ${cols}x${rows} grid (max ${maxCols} columns for document scanning)`);

  // Generate rainbow gradient colors for main records
  const rainbowColors = generateRainbowGradient(recordCount);

  // Track row heights for proper grid spacing
  const rowHeights = [];
  const recordHeights = [];

  // First pass: calculate all record heights (estimate for all types)
  for (let i = 0; i < jsonObjects.length; i++) {
    const obj = jsonObjects[i];
    let recordHeight = 100; // Minimum height
    
    // Estimate height based on content for all object types
    if (typeof obj === 'object' && obj !== null) {
      let estimatedNodes = 0;
      
      if ('_section' in obj && '_index' in obj) {
        // Flattened record structure
        const record = obj;
        const dataEntries = Object.entries(record).filter(([key]) => !key.startsWith('_'));
        
        for (const [, value] of dataEntries) {
          if (typeof value === 'object' && value !== null) {
            if (Array.isArray(value)) {
              estimatedNodes += value.length;
            } else {
              const subEntries = Object.entries(value);
              for (const [, subValue] of subEntries) {
                if (Array.isArray(subValue)) {
                  estimatedNodes += subValue.length;
                } else {
                  estimatedNodes += 1;
                }
              }
            }
          } else {
            estimatedNodes += 1;
          }
        }
      } else {
        // Regular object structure - count all properties recursively
        const countNodes = (value) => {
          if (typeof value === 'object' && value !== null) {
            if (Array.isArray(value)) {
              return value.length;
            } else {
              let count = 0;
              for (const [, subValue] of Object.entries(value)) {
                count += countNodes(subValue);
              }
              return count;
            }
          }
          return 1;
        };
        
        estimatedNodes = countNodes(obj);
      }
      
      // Calculate height: base + nodes in 2-column layout + spacing
      const nodeRows = Math.ceil(estimatedNodes / 2);
      recordHeight = 50 + (nodeRows * (nodeHeight + nodeSpacing)) + (Object.keys(obj).length * sectionSpacing) + 100;
    }
    
    recordHeights.push(recordHeight);
    
    // Track max height per row
    const row = Math.floor(i / cols);
    if (!rowHeights[row]) {
      rowHeights[row] = 0;
    }
    rowHeights[row] = Math.max(rowHeights[row], recordHeight);
  }

  // Calculate cumulative row positions
  const rowPositions = [0];
  for (let row = 1; row < rows; row++) {
    rowPositions[row] = rowPositions[row - 1] + rowHeights[row - 1] + 100; // 100px spacing between rows
  }

  // Process each JSON object
  for (let i = 0; i < jsonObjects.length; i++) {
    const obj = jsonObjects[i];
    const baseColor = rainbowColors[i];
    const hierarchicalColors = generateHierarchicalColors(baseColor, 6);
    
    // Calculate grid position
    const col = i % cols;
    const row = Math.floor(i / cols);
    const gridX = col * totalRecordWidth;
    const gridY = rowPositions[row]; // Use calculated row position
    
    // STEP 1: Place all nodes first in proper 2-column layout
    const nodePlacements = [];
    let currentY = gridY + 50; // Space for parent group label
    let currentColumn = 0;
    
    // Universal node placement function for all object types
    const placeNodesFromObject = (
      value, 
      parentPath, 
      keyPrefix = ''
    ) => {
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          // Handle arrays
          const arrayLabel = keyPrefix ? `${keyPrefix} [${value.length}]` : `Array [${value.length}]`;
          const arrayPath = [...parentPath, arrayLabel];
          
          value.forEach((item, index) => {
            const columnX = gridX + groupPadding + (currentColumn * (columnWidth + columnSpacing));
            
            nodePlacements.push({
              id: generateId(),
              type: 'text',
              text: `**[${index}]**: ${item === null ? 'null' : typeof item === 'string' ? `"${item}"` : String(item)}`,
              x: columnX,
              y: currentY,
              width: columnWidth,
              height: nodeHeight,
              color: hierarchicalColors[Math.min(arrayPath.length, hierarchicalColors.length - 1)],
              groupPath: arrayPath,
            });
            
            currentColumn = (currentColumn + 1) % 2;
            if (currentColumn === 0) {
              currentY += nodeHeight + nodeSpacing;
            }
          });
          
          // Ensure we end on a new row
          if (currentColumn !== 0) {
            currentY += nodeHeight + nodeSpacing;
            currentColumn = 0;
          }
          
          // Add extra spacing after arrays
          currentY += groupSpacing;
          
        } else {
          // Handle objects
          const objectEntries = Object.entries(value);
          
          // Group simple and complex properties
          const simpleEntries = objectEntries.filter(([, val]) => 
            typeof val !== 'object' || val === null
          );
          const complexEntries = objectEntries.filter(([, val]) => 
            typeof val === 'object' && val !== null
          );
          
          // Place simple properties first
          if (simpleEntries.length > 0) {
            const objectLabel = keyPrefix || 'Object';
            const objectPath = [...parentPath, objectLabel];
            
            for (const [key, val] of simpleEntries) {
              const columnX = gridX + groupPadding + (currentColumn * (columnWidth + columnSpacing));
              
              nodePlacements.push({
                id: generateId(),
                type: 'text',
                text: `**${key}**: ${val === null ? 'null' : typeof val === 'string' ? `"${val}"` : String(val)}`,
                x: columnX,
                y: currentY,
                width: columnWidth,
                height: nodeHeight,
                color: hierarchicalColors[Math.min(objectPath.length, hierarchicalColors.length - 1)],
                groupPath: objectPath,
              });
              
              currentColumn = (currentColumn + 1) % 2;
              if (currentColumn === 0) {
                currentY += nodeHeight + nodeSpacing;
              }
            }
            
            // Ensure we end on a new row
            if (currentColumn !== 0) {
              currentY += nodeHeight + nodeSpacing;
              currentColumn = 0;
            }
            
            // Add spacing after simple properties
            if (complexEntries.length > 0) {
              currentY += groupSpacing;
            }
          }
          
          // Place complex properties recursively
          for (const [key, val] of complexEntries) {
            currentY += sectionSpacing; // Extra spacing before complex sections
            placeNodesFromObject(val, parentPath, key);
          }
        }
      } else {
        // Handle primitive values
        const columnX = gridX + groupPadding + (currentColumn * (columnWidth + columnSpacing));
        
        nodePlacements.push({
          id: generateId(),
          type: 'text',
          text: keyPrefix ? `**${keyPrefix}**: ${value === null ? 'null' : typeof value === 'string' ? `"${value}"` : String(value)}` : String(value),
          x: columnX,
          y: currentY,
          width: columnWidth,
          height: nodeHeight,
          color: hierarchicalColors[Math.min(parentPath.length, hierarchicalColors.length - 1)],
          groupPath: parentPath,
        });
        
        currentColumn = (currentColumn + 1) % 2;
        if (currentColumn === 0) {
          currentY += nodeHeight + nodeSpacing;
        }
      }
    };
    
    // Determine parent group label and process object
    let parentGroupLabel;
    
    if (typeof obj === 'object' && obj !== null && '_section' in obj && '_index' in obj) {
      // Flattened record structure
      const record = obj;
      const sectionName = String(record._section);
      const recordIndex = Number(record._index);
      parentGroupLabel = `${sectionName} ${recordIndex}`;
      
      // Process only the data entries (skip _section and _index)
      const dataEntries = Object.entries(record).filter(([key]) => !key.startsWith('_'));
      const dataObject = Object.fromEntries(dataEntries);
      placeNodesFromObject(dataObject, [parentGroupLabel]);
      
    } else {
      // Regular object or Canvas node structure
      parentGroupLabel = `Record ${i + 1}`;
      placeNodesFromObject(obj, [parentGroupLabel]);
    }
    
    // STEP 2: Calculate group boundaries based on actual node positions
    const groupBoundaries = new Map();
    
    // Group nodes by their group paths
    for (const node of nodePlacements) {
      for (let depth = 0; depth < node.groupPath.length; depth++) {
        const groupKey = node.groupPath.slice(0, depth + 1).join(' > ');
        
        if (!groupBoundaries.has(groupKey)) {
          groupBoundaries.set(groupKey, {
            minX: node.x,
            minY: node.y,
            maxX: node.x + node.width,
            maxY: node.y + node.height,
            nodes: [],
            color: hierarchicalColors[depth] || hierarchicalColors[hierarchicalColors.length - 1],
            depth,
          });
        }
        
        const boundary = groupBoundaries.get(groupKey);
        boundary.minX = Math.min(boundary.minX, node.x);
        boundary.minY = Math.min(boundary.minY, node.y);
        boundary.maxX = Math.max(boundary.maxX, node.x + node.width);
        boundary.maxY = Math.max(boundary.maxY, node.y + node.height);
        boundary.nodes.push(node);
      }
    }
    
    // STEP 3: Create groups with proper boundaries and same width
    for (const [groupKey, boundary] of groupBoundaries.entries()) {
      const groupPath = groupKey.split(' > ');
      const groupLabel = groupPath[groupPath.length - 1];
      const isParent = groupPath.length === 1;
      
      // Calculate group dimensions
      let groupX = gridX;
      let groupY = boundary.minY - 30; // Space for group label
      let groupWidth = recordWidth;
      let groupHeight;
      
      if (isParent) {
        // Parent group spans entire record
        groupY = gridY;
        groupHeight = currentY - gridY + 20;
      } else {
        // Child group only as tall as needed
        groupHeight = boundary.maxY - boundary.minY + 60; // Extra space for label and padding
      }
      
      groupNodes.push({
        id: generateId(),
        type: 'group',
        label: groupLabel,
        x: groupX,
        y: groupY,
        width: groupWidth,
        height: groupHeight,
        color: boundary.color,
      });
    }
    
    // STEP 4: Add all content nodes
    for (const node of nodePlacements) {
      contentNodes.push({
        id: node.id,
        type: node.type,
        text: node.text,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        color: node.color,
      });
    }
  }

  // Solitaire-style layering: groups first (bottom), then content (top)
  const nodes = [...groupNodes, ...contentNodes];
  
  return { nodes, edges: [] };
}


/**
 * Check if JSON data is a pure Canvas export (should be treated like JSONL records)
 */
export function isPureCanvasExport(data) {
  // Check if it has the Canvas export structure: {nodes: [...], edges: [...]}
  if (typeof data === 'object' && data !== null && Array.isArray(data.nodes)) {
    // Check if nodes contain Canvas node properties
    const firstNode = data.nodes[0];
    if (firstNode && typeof firstNode === 'object' && 
        'id' in firstNode && 'type' in firstNode) {
      return true;
    }
  }
  return false;
}

/**
 * Import pure Canvas data (.pure.json files) with intelligent semantic mapping.
 * Maps **id**, **type**, **label**, **text** patterns back to proper Canvas fields.
 * Uses 8-column single-node layout matching the golden reference structure.
 */
export function importPureCanvasDataCLI(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid pure Canvas data: expected object with nodes array');
  }
  
  // Extract nodes array from Canvas structure
  const sourceNodes = Array.isArray(data.nodes) ? data.nodes : [];
  if (sourceNodes.length === 0) {
    return { nodes: [], edges: [] };
  }
  
  const outputNodes = [];
  let idCounter = 0;
  const generateId = () => `imported-${(idCounter++).toString(16).padStart(16, '0')}`;
  
  // Configuration matching golden reference (8 columns, 310px width, 360px spacing)
  const recordWidth = 310;
  const recordSpacing = 360; // Matches golden file spacing
  const maxCols = 8;
  const groupPadding = 10;
  const nodeWidth = 250;
  const nodeHeight = 60;
  const nodeSpacing = 80; // Vertical spacing between nodes
  
  // Generate rainbow colors for records
  const rainbowColors = generateRainbowGradient(sourceNodes.length);
  
  // Process each source node as a separate record
  sourceNodes.forEach((sourceNode, recordIndex) => {
    const recordColor = rainbowColors[recordIndex % rainbowColors.length];
    const hierarchicalColors = generateHierarchicalColors(recordColor, 3);
    
    // Calculate grid position (8 columns)
    const col = recordIndex % maxCols;
    const row = Math.floor(recordIndex / maxCols);
    const gridX = col * recordSpacing;
    const gridY = row * 1000; // Generous row spacing for varying heights
    
    // Extract semantic information and create proper Canvas node
    const canvasNode = createCanvasNodeFromSourceCLI(sourceNode, generateId);
    
    // Position the node
    canvasNode.x = gridX + groupPadding;
    canvasNode.y = gridY + 120; // Space for parent group header
    canvasNode.width = nodeWidth;
    canvasNode.height = calculateNodeHeightCLI(canvasNode);
    canvasNode.color = hierarchicalColors[1];
    
    // Create nested group structure matching golden reference
    const objectGroupId = generateId();
    const recordGroupId = generateId();
    
    // Object group (inner)
    const objectGroup = {
      id: objectGroupId,
      type: 'group',
      label: 'Object',
      x: gridX + groupPadding,
      y: gridY + 80,
      width: 300,
      height: canvasNode.height + 100,
      color: hierarchicalColors[0],
    };
    
    // Record group (outer)  
    const recordGroup = {
      id: recordGroupId,
      type: 'group',
      label: `Record ${recordIndex + 1}`,
      x: gridX,
      y: gridY,
      width: recordWidth,
      height: canvasNode.height + 140,
      color: recordColor,
    };
    
    // Add nodes in solitaire order: groups first, then content
    outputNodes.push(recordGroup, objectGroup, canvasNode);
  });
  
  return { nodes: outputNodes, edges: [] };
}

/**
 * Create a proper Canvas node from source node with semantic field mapping.
 * Extracts **id**, **type**, **label**, **text** patterns and maps to Canvas fields.
 */
export function createCanvasNodeFromSourceCLI(sourceNode, generateId) {
  // Start with source node as base
  const canvasNode = {
    id: sourceNode.id || generateId(),
    type: sourceNode.type || 'text',
  };
  
  // If source has text content, process it for semantic extraction
  if (sourceNode.text && typeof sourceNode.text === 'string') {
    const extracted = extractSemanticFieldsCLI(sourceNode.text);
    
    // Apply extracted semantic fields to Canvas node
    if (extracted.id) canvasNode.id = extracted.id;
    if (extracted.type) canvasNode.type = extracted.type;
    if (extracted.label) canvasNode.label = extracted.label;
    if (extracted.text) canvasNode.text = extracted.text;
    
    // If no semantic text was extracted, use original text
    if (!extracted.text && !extracted.label) {
      canvasNode.text = sourceNode.text;
    }
  } else {
    // Copy other fields directly
    if (sourceNode.label) canvasNode.label = sourceNode.label;
    if (sourceNode.text) canvasNode.text = sourceNode.text;
  }
  
  return canvasNode;
}

/**
 * Extract semantic fields from text content.
 * Parses **field**: "value" patterns and returns structured data.
 */
export function extractSemanticFieldsCLI(text) {
  const result = {};
  let remainingText = text;
  
  // Extract **id**: "value" pattern
  const idMatch = text.match(/\*\*id\*\*:\s*"([^"]+)"/);
  if (idMatch) {
    result.id = idMatch[1];
    remainingText = remainingText.replace(idMatch[0], '').trim();
  }
  
  // Extract **type**: "value" pattern
  const typeMatch = text.match(/\*\*type\*\*:\s*"([^"]+)"/);
  if (typeMatch) {
    result.type = typeMatch[1];
    remainingText = remainingText.replace(typeMatch[0], '').trim();
  }
  
  // Extract **label**: "value" pattern
  const labelMatch = text.match(/\*\*label\*\*:\s*"([^"]+)"/);
  if (labelMatch) {
    result.label = labelMatch[1];
    remainingText = remainingText.replace(labelMatch[0], '').trim();
  }
  
  // Extract **text**: "value" pattern (handles multiline content)
  const textMatch = text.match(/\*\*text\*\*:\s*"([\s\S]*?)"/);
  if (textMatch) {
    result.text = textMatch[1];
    remainingText = remainingText.replace(textMatch[0], '').trim();
  }
  
  // If there's remaining content after extraction, use it as text
  remainingText = remainingText.replace(/^\s*\n+|\n+\s*$/g, '').trim();
  if (remainingText && !result.text && !result.label) {
    result.text = remainingText;
  }
  
  return result;
}

/**
 * Calculate appropriate height for a Canvas node based on its content.
 */
export function calculateNodeHeightCLI(node) {
  const baseHeight = 60;
  
  if (node.text && typeof node.text === 'string') {
    const lines = node.text.split('\n').length;
    const estimatedHeight = Math.max(baseHeight, lines * 20 + 40);
    return Math.min(estimatedHeight, 2640); // Cap at reasonable max
  }
  
  return baseHeight;
}

/**
 * Extract semantic information from Canvas node content.
 * Parses **id**: "value" and **type**: "value" patterns to restore Canvas semantics.
 */
export function extractSemanticInfoCLI(node) {
  if (!node.text || typeof node.text !== 'string') {
    return { cleanText: node.text || '' };
  }
  
  const text = node.text;
  let semanticId;
  let semanticType;
  let cleanText = text;
  
  // Extract **id**: "value" pattern
  const idMatch = text.match(/\*\*id\*\*:\s*"([^"]+)"/);
  if (idMatch) {
    semanticId = idMatch[1];
    cleanText = cleanText.replace(idMatch[0], '').trim();
  }
  
  // Extract **type**: "value" pattern
  const typeMatch = text.match(/\*\*type\*\*:\s*"([^"]+)"/);
  if (typeMatch) {
    semanticType = typeMatch[1];
    cleanText = cleanText.replace(typeMatch[0], '').trim();
  }
  
  // Clean up extra whitespace and empty lines
  cleanText = cleanText.replace(/^\s*\n+|\n+\s*$/g, '').trim();
  
  // If we extracted id and type, and there's remaining content, format it properly
  if ((semanticId || semanticType) && cleanText) {
    // Look for other **key**: value patterns to preserve
    const remainingMatches = cleanText.match(/\*\*[^*]+\*\*:\s*[^\n]+/g);
    if (remainingMatches) {
      cleanText = remainingMatches.join('\n');
    }
  }
  
  return { semanticId, semanticType, cleanText };
}

/**
 * Unified import function that detects input type by file extension and content.
 * Supports .json, .jsonl files with automatic type detection and enhanced visual features.
 * Special handling for .pure.json files (Canvas exports) with 8-column layout.
 */
export function importDataToCanvasEnhanced(filePath, fileContent) {
  const fileName = filePath.toLowerCase();
  const extension = fileName.split('.').pop();
  const isPureCanvas = fileName.includes('.pure.json');
  
  try {
    if (extension === 'jsonl') {
      // JSONL: Parse each line as separate JSON object
      const lines = fileContent.trim().split('\n').filter(line => line.trim());
      const jsonObjects = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch (err) {
          throw new Error(`Invalid JSON in JSONL: ${err.message}`);
        }
      });
      return importJsonlToCanvasEnhanced(jsonObjects);
    } else {
      // JSON: Parse as single object or array
      const data = JSON.parse(fileContent);
      
      // Check if it's a pure Canvas export
      if (isPureCanvas || isPureCanvasExport(data)) {
        return importPureCanvasDataCLI(data);
      }
      
      // Regular JSON import
      return importJsonToCanvasEnhanced(data);
    }
  } catch (err) {
    throw new Error(`Failed to import ${filePath}: ${err.message}`);
  }
}

/**
 * Main import file function - handles file I/O and delegates to appropriate importer
 */
export function importFile({ inPath, outPath }) {
  const absIn = path.resolve(String(inPath ?? '').trim());
  const fileContent = fs.readFileSync(absIn, 'utf8');
  
  // Use the enhanced unified import function with beautiful colors and grid organization
  const canvas = importDataToCanvasEnhanced(absIn, fileContent);
  
  // Determine output path
  const stem = path.basename(absIn).replace(/\.(json|jsonl)$/i, '');
  const absOut = String(outPath ?? '').trim() || path.resolve(path.dirname(absIn), `${stem}.canvas`);
  
  // Write Canvas file
  const serialized = JSON.stringify(canvas, null, 2) + '\n';
  fs.writeFileSync(absOut, serialized, 'utf8');

  return {
    inPath: absIn,
    outPath: absOut,
    nodesOut: canvas.nodes.length,
    edgesOut: canvas.edges.length,
  };
}

/**
 * Import JSONL file - each line is a separate JSON object
 */
export function importJsonlFile({ inPath, outPath }) {
  const absIn = path.resolve(String(inPath ?? '').trim());
  const raw = fs.readFileSync(absIn, 'utf8');
  
  // Parse JSONL: split by lines and parse each non-empty line as JSON
  const lines = raw.split('\n').filter(line => line.trim());
  const jsonObjects = lines.map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`Invalid JSON on line ${index + 1}: ${error.message}`);
    }
  });

  const stem = path.basename(absIn).replace(/\.jsonl$/i, '');

  // Default output to same directory as input
  const absOut = String(outPath ?? '').trim() || path.resolve(path.dirname(absIn), `${stem}.canvas`);

  // Import JSONL to Canvas with enhanced rainbow gradient coloring
  const canvas = importJsonlToCanvasEnhanced(jsonObjects);
  const serialized = JSON.stringify(canvas, null, 2) + '\n';

  fs.writeFileSync(absOut, serialized, 'utf8');

  return {
    inPath: absIn,
    outPath: absOut,
    recordsIn: jsonObjects.length,
    nodesOut: canvas.nodes.length,
    edgesOut: canvas.edges.length,
  };
}

/**
 * Import JSON file - single JSON object or array
 */
export function importJsonFile({ inPath, outPath }) {
  const absIn = path.resolve(String(inPath ?? '').trim());
  const input = readJson(absIn);
  const stem = path.basename(absIn).replace(/\.json$/i, '');

  // Default output to same directory as input
  const absOut = String(outPath ?? '').trim() || path.resolve(path.dirname(absIn), `${stem}.canvas`);

  // Import JSON to Canvas with enhanced hierarchical coloring
  const canvas = importJsonToCanvasEnhanced(input);
  const serialized = JSON.stringify(canvas, null, 2) + '\n';

  fs.writeFileSync(absOut, serialized, 'utf8');

  return {
    inPath: absIn,
    outPath: absOut,
    nodesOut: canvas.nodes.length,
    edgesOut: canvas.edges.length,
  };
}
