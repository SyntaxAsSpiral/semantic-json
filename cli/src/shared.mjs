import fs from 'node:fs';

/**
 * File I/O utilities
 */
export function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

/**
 * Data validation and normalization utilities
 */
export function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

export function normalizedId(value) {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

/**
 * Node sorting utilities
 */
export function getNodeSortKey(node) {
  const type = node?.type;

  // Text nodes: sort by text content
  if (type === 'text' && typeof node.text === 'string') {
    return node.text.toLowerCase().trim();
  }

  // File nodes: sort by filename (basename)
  if (type === 'file' && typeof node.file === 'string') {
    const filename = node.file.split('/').pop() || node.file;
    return filename.toLowerCase().trim();
  }

  // Link nodes: sort by raw URL (keeps protocol, clusters by http/https)
  if (type === 'link' && typeof node.url === 'string') {
    return node.url.toLowerCase().trim();
  }

  // Group nodes: sort by label
  if (type === 'group' && typeof node.label === 'string') {
    return node.label.toLowerCase().trim();
  }

  // Fallback to node id
  return normalizedId(node?.id).toLowerCase();
}

export function getNodeTypePriority(node) {
  const type = node?.type;
  // Link nodes go to bottom (highest priority number)
  if (type === 'link') return 1;
  // All other types (text, file, group) sort first
  return 0;
}

/**
 * Color utilities for nodes and edges
 */
export function getNodeColor(node) {
  const color = node?.color;
  if (typeof color === 'string') {
    return color.toLowerCase();
  }
  // No color = empty string (sorts first)
  return '';
}

export function getEdgeColor(edge) {
  const color = edge?.color;
  if (typeof color === 'string') {
    return color.toLowerCase();
  }
  // No color = empty string (sorts first)
  return '';
}

export function isDirectionalEdge(edge) {
  const fromEnd = edge?.fromEnd;
  const toEnd = edge?.toEnd;
  // Default: fromEnd=none, toEnd=arrow (directional forward)
  // Non-directional: both are none
  if (fromEnd === 'arrow' || toEnd === 'arrow') return true;
  if (toEnd === undefined && fromEnd !== 'arrow') return true; // default arrow at toEnd
  return false;
}

/**
 * Containment checking for hierarchical structures
 */
export function isContainedBy(node, group) {
  const nx = isFiniteNumber(node?.x) ? node.x : 0;
  const ny = isFiniteNumber(node?.y) ? node.y : 0;
  const nw = isFiniteNumber(node?.width) ? node.width : 0;
  const nh = isFiniteNumber(node?.height) ? node.height : 0;

  const gx = isFiniteNumber(group?.x) ? group.x : 0;
  const gy = isFiniteNumber(group?.y) ? group.y : 0;
  const gw = isFiniteNumber(group?.width) ? group.width : 0;
  const gh = isFiniteNumber(group?.height) ? group.height : 0;

  // Node is contained if its bounding box is within group's bounding box
  return nx >= gx && ny >= gy && nx + nw <= gx + gw && ny + nh <= gy + gh;
}

/**
 * Color manipulation utilities
 */
export function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: h = 0;
    }
    h /= 6;
  }

  return [h * 360, s * 100, l * 100];
}

export function hslToHex(h, s, l) {
  h = h / 360;
  s = s / 100;
  l = l / 100;

  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  let r, g, b;
  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  const toHex = (c) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function mutateColor(hex, hueShift, satMult, lightMult) {
  let [h, s, l] = hexToHsl(hex);
  
  h = (h + hueShift) % 360;
  if (h < 0) h += 360;
  
  s = Math.max(0, Math.min(100, s * satMult));
  l = Math.max(0, Math.min(100, l * lightMult));
  
  return hslToHex(h, s, l);
}

export function generateRainbowGradient(count) {
  const colors = [];
  const baseHues = [0, 30, 60, 120, 180, 240, 300]; // Red, Orange, Yellow, Green, Cyan, Blue, Purple
  
  for (let i = 0; i < count; i++) {
    // Cycle through base hues, then interpolate between them
    const hueIndex = i % baseHues.length;
    const cyclePosition = Math.floor(i / baseHues.length);
    
    // Add slight variation for multiple cycles
    const hueVariation = cyclePosition * 15; // 15 degree shift per cycle
    const baseHue = baseHues[hueIndex];
    const finalHue = (baseHue + hueVariation) % 360;
    
    // Vary saturation and lightness for visual interest
    const saturation = 65 + (i % 3) * 10; // 65-85%
    const lightness = 70 + (i % 4) * 5;   // 70-85%
    
    colors.push(hslToHex(finalHue, saturation, lightness));
  }
  
  return colors;
}

export function generateHierarchicalColors(baseColor, depth) {
  const colors = [baseColor];
  
  for (let i = 1; i <= depth; i++) {
    // Each level gets progressively more muted and shifted
    const hueShift = i * 25; // Shift hue by 25 degrees per level
    const satReduction = 0.85 - (i * 0.1); // Reduce saturation
    const lightIncrease = 1.1 + (i * 0.05); // Increase lightness slightly
    
    const mutatedColor = mutateColor(baseColor, hueShift, satReduction, lightIncrease);
    colors.push(mutatedColor);
  }
  
  return colors;
}
