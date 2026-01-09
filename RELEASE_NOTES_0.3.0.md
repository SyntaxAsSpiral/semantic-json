# Release Notes - Semantic JSON v0.3.0

## 🎯 Headline Feature: Labeled Edge Embedding

**Transform your Canvas edge labels into structured relationship data.**

Labeled edges are now automatically embedded into connected nodes as directional `from` and `to` arrays, creating self-contained relationship data perfect for:

- **Infrastructure-as-Code workflows** - Document system architecture with semantic edges (`blocks`, `triggers`, `depends-on`)
- **LLM consumption** - Relationships are in-context with nodes (no ID lookup required)
- **Executable graphs** - Edge labels become operational predicates for schedulers and interpreters
- **Self-documenting systems** - Your Canvas becomes a living specification

**Example transformation:**

```json
// Before: Traditional edge array
{
  "nodes": [
    {"id": "A", "type": "text", "text": "Start Process"},
    {"id": "B", "type": "text", "text": "End Process"}
  ],
  "edges": [
    {"id": "edge1", "fromNode": "A", "toNode": "B", "label": "triggers"}
  ]
}

// After: Pure JSON export with embedded relationships
{
  "nodes": [
    {
      "id": "A",
      "type": "text",
      "text": "Start Process",
      "to": [{"node": "B", "label": "triggers"}]
    },
    {
      "id": "B",
      "type": "text",
      "text": "End Process",
      "from": [{"node": "A", "label": "triggers"}]
    }
  ]
}
```

**Behavior:**
- Labeled edges → embedded into nodes (removed from main `edges` array)
- Unlabeled edges → preserved in main `edges` array (existing behavior)
- Directional semantics preserved (`from` = incoming, `to` = outgoing)

---

## ⚡ Pure JSON Export Enhancements

### Semantic Orphan Node Grouping
New option to group orphan nodes (nodes not in any group) at the top level with semantic sorting instead of spatial sorting. Perfect for structured data exports.

**CLI flag:** `--group-orphan-nodes`
**Plugin setting:** "Group orphan nodes" (default: disabled)

### Spatial Child Group Sorting
Child groups within hierarchical structures now sort spatially (y, x position) for predictable, consistent output ordering.

### File Node Improvements
File nodes now sort by filename instead of full path, producing cleaner Pure JSON output.

---

## 🛠️ Build System Modernization

- **Migrated from Rollup to esbuild** - Faster builds, modern tooling, better developer experience
- **Modern ESLint configuration** - Flat config format with `eslint-plugin-obsidianmd`
- **Improved linting** - TypeScript parser with `projectService: true`
- **Better dev workflow** - Updated scripts and configurations

---

## 📚 Documentation

- **867 lines of spec improvements** - Comprehensive updates to `semantic-json-spec.md`
- **Before/after examples** - Visual comparison images
- **Updated conformance tests** - Expanded test Canvas files
- **CLI documentation** - Enhanced usage guide with all new options

---

## 🔧 Technical Improvements

- Refactored settings with clearer descriptions
- Improved compile.ts logic for better maintainability
- Enhanced type safety throughout codebase
- Better error handling in CLI

---

## 📦 Upgrade Notes

This release is **fully backward compatible**. Existing Canvas files will continue to work exactly as before.

**To use new features:**
- Enable "Group orphan nodes" in settings for semantic orphan grouping
- Add labels to edges in Canvas to use embedded relationship export
- Update CLI scripts to use new `--group-orphan-nodes` flag if desired

---

## 🙏 Acknowledgments

Built with collaboration from Claude Sonnet 4.5 as part of the ongoing exploration of human/AI symbiotic development workflows.

---

**Full Changelog:** 0.2.0...0.3.0 (87 commits)
