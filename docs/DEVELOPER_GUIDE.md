# OpenSuite Document Editor - Developer Guide

## Overview

This guide is for developers who want to extend, customize, or integrate with the OpenSuite Document Editor. It covers the architecture, plugin system, customization options, and integration patterns.

## Architecture

### Core Components

The OpenSuite Document Editor is built with a modular architecture:

```
┌─────────────────────────────────────────────────────────┐
│                    UI Layer (React)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Toolbar  │  │  Canvas  │  │ Sidebar  │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘
                         │
┌─────────────────────────────────────────────────────────┐
│              Editor Engine (ContentEditable)            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Commands │  │  Events  │  │  State   │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘
                         │
┌─────────────────────────────────────────────────────────┐
│                  Plugin System                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Plugins  │  │ Extensions│  │  Hooks   │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘
                         │
┌─────────────────────────────────────────────────────────┐
│                Backend Services                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │   API    │  │WebSocket │  │ Storage  │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS
- **Editor Engine:** ContentEditable API with custom extensions
- **State Management:** React Context + Custom hooks
- **Real-time:** WebSocket with Operational Transformation
- **Storage:** IndexedDB (local), Cloud APIs (remote)
- **Build Tool:** Vite
- **Testing:** Jest, React Testing Library

## Plugin System

### Creating a Plugin

Plugins extend the editor's functionality. Here's how to create one:

```typescript
// my-plugin.ts
import { EditorPlugin, PluginContext } from '@opensuite/editor';

export class MyPlugin implements EditorPlugin {
  name = 'my-plugin';
  
  initialize(context: PluginContext) {
    // Add custom commands
    context.registerCommand('myCommand', (args) => {
      // Command implementation
    });
    
    // Add toolbar button
    context.addToolbarButton({
      id: 'myButton',
      icon: 'star',
      tooltip: 'My Custom Action',
      onClick: () => context.executeCommand('myCommand')
    });
    
    // Listen to events
    context.on('documentChange', (event) => {
      console.log('Document changed:', event);
    });
  }
  
  destroy() {
    // Cleanup
  }
}
```

### Registering a Plugin

```typescript
// main.ts
import { Editor } from '@opensuite/editor';
import { MyPlugin } from './my-plugin';

const editor = new Editor({
  container: '#editor',
  plugins: [new MyPlugin()]
});
```

### Plugin API

#### Context Methods

```typescript
interface PluginContext {
  // Commands
  registerCommand(name: string, handler: CommandHandler): void;
  executeCommand(name: string, args?: any): void;
  
  // Toolbar
  addToolbarButton(button: ToolbarButton): void;
  removeToolbarButton(id: string): void;
  
  // Events
  on(event: string, handler: EventHandler): void;
  off(event: string, handler: EventHandler): void;
  emit(event: string, data?: any): void;
  
  // Document
  getContent(): string;
  setContent(content: string): void;
  getSelection(): Selection;
  setSelection(selection: Selection): void;
  
  // UI
  showModal(modal: ModalConfig): void;
  showToast(message: string, type?: 'success' | 'error' | 'info'): void;
  
  // Storage
  getState(): any;
  setState(state: any): void;
}
```

#### Available Events

- `documentChange` - Document content changed
- `selectionChange` - Selection changed
- `focus` - Editor gained focus
- `blur` - Editor lost focus
- `beforeCommand` - Before command execution
- `afterCommand` - After command execution
- `pluginLoaded` - Plugin loaded
- `pluginUnloaded` - Plugin unloaded

## Customization

### Theming

Override default styles using CSS custom properties:

```css
:root {
  /* Colors */
  --os-primary: #3b82f6;
  --os-secondary: #64748b;
  --os-success: #10b981;
  --os-warning: #f59e0b;
  --os-error: #ef4444;
  
  /* Typography */
  --os-font-family: 'Inter', sans-serif;
  --os-font-size-base: 14px;
  --os-line-height: 1.5;
  
  /* Spacing */
  --os-spacing-xs: 4px;
  --os-spacing-sm: 8px;
  --os-spacing-md: 16px;
  --os-spacing-lg: 24px;
  
  /* Borders */
  --os-border-radius: 6px;
  --os-border-width: 1px;
  
  /* Shadows */
  --os-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --os-shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --os-shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
}
```

### Custom Toolbar

```typescript
const editor = new Editor({
  container: '#editor',
  toolbar: {
    items: [
      { type: 'button', command: 'bold', icon: 'bold' },
      { type: 'button', command: 'italic', icon: 'italic' },
      { type: 'separator' },
      { type: 'dropdown', command: 'fontSize', options: [12, 14, 16, 18, 20] },
      { type: 'separator' },
      { type: 'custom', component: MyCustomComponent }
    ]
  }
});
```

### Custom Commands

```typescript
editor.registerCommand('highlight', {
  execute: (color: string) => {
    const selection = editor.getSelection();
    editor.wrapSelection('span', {
      style: `background-color: ${color}`
    });
  },
  validate: () => {
    return !editor.getSelection().isCollapsed();
  }
});
```

### Custom Formats

```typescript
editor.registerFormat('code-block', {
  element: 'pre',
  attributes: {
    class: 'code-block',
    'data-language': '{language}'
  },
  parser: (element) => {
    return {
      language: element.getAttribute('data-language') || 'text'
    };
  },
  serializer: (data) => {
    return `<pre class="code-block" data-language="${data.language}">...</pre>`;
  }
});
```

## Integration

### React Integration

```typescript
import { EditorProvider, useEditor } from '@opensuite/editor-react';

function MyComponent() {
  return (
    <EditorProvider config={{ plugins: [new MyPlugin()] }}>
      <EditorToolbar />
      <EditorCanvas />
      <EditorSidebar />
    </EditorProvider>
  );
}

function Toolbar() {
  const editor = useEditor();
  
  return (
    <button onClick={() => editor.executeCommand('bold')}>
      Bold
    </button>
  );
}
```

### Vue Integration

```vue
<template>
  <div ref="editorContainer"></div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { Editor } from '@opensuite/editor';

const editorContainer = ref(null);
let editor = null;

onMounted(() => {
  editor = new Editor({
    container: editorContainer.value,
    plugins: [new MyPlugin()]
  });
});
</script>
```

### Angular Integration

```typescript
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Editor } from '@opensuite/editor';

@Component({
  selector: 'app-editor',
  template: '<div #editorContainer></div>'
})
export class EditorComponent implements OnInit {
  @ViewChild('editorContainer') editorContainer!: ElementRef;
  private editor!: Editor;

  ngOnInit() {
    this.editor = new Editor({
      container: this.editorContainer.nativeElement,
      plugins: [new MyPlugin()]
    });
  }
}
```

## Testing

### Unit Testing Plugins

```typescript
import { MyPlugin } from './my-plugin';
import { createMockContext } from '@opensuite/editor/testing';

describe('MyPlugin', () => {
  let plugin: MyPlugin;
  let context: PluginContext;

  beforeEach(() => {
    plugin = new MyPlugin();
    context = createMockContext();
    plugin.initialize(context);
  });

  it('should register command', () => {
    expect(context.registerCommand).toHaveBeenCalledWith(
      'myCommand',
      expect.any(Function)
    );
  });

  it('should add toolbar button', () => {
    expect(context.addToolbarButton).toHaveBeenCalledWith({
      id: 'myButton',
      icon: 'star',
      tooltip: 'My Custom Action',
      onClick: expect.any(Function)
    });
  });
});
```

### Integration Testing

```typescript
import { render, screen } from '@testing-library/react';
import { EditorProvider } from '@opensuite/editor-react';
import { MyPlugin } from './my-plugin';

describe('Editor with MyPlugin', () => {
  it('should render custom button', () => {
    render(
      <EditorProvider config={{ plugins: [new MyPlugin()] }}>
        <EditorToolbar />
      </EditorProvider>
    );
    
    expect(screen.getByText('My Custom Action')).toBeInTheDocument();
  });
});
```

## Performance Optimization

### Lazy Loading Plugins

```typescript
const editor = new Editor({
  container: '#editor',
  plugins: [
    // Load immediately
    new CorePlugin(),
    
    // Load lazily
    () => import('./heavy-plugin').then(m => new m.HeavyPlugin())
  ]
});
```

### Debouncing Events

```typescript
import { debounce } from '@opensuite/editor/utils';

class MyPlugin implements EditorPlugin {
  initialize(context: PluginContext) {
    const handleChange = debounce((event) => {
      // Expensive operation
      this.analyzeDocument(context.getContent());
    }, 500);
    
    context.on('documentChange', handleChange);
  }
}
```

### Virtual Scrolling

For large documents, use virtual scrolling:

```typescript
const editor = new Editor({
  container: '#editor',
  virtualization: {
    enabled: true,
    itemHeight: 24,
    overscan: 5
  }
});
```

## Security

### Sanitization

All content is sanitized by default. To customize:

```typescript
const editor = new Editor({
  sanitizer: {
    allowedTags: ['p', 'br', 'strong', 'em', 'u'],
    allowedAttributes: {
      'a': ['href', 'title'],
      'img': ['src', 'alt']
    },
    allowedStyles: {
      '*': ['color', 'background-color']
    }
  }
});
```

### Content Security Policy

Recommended CSP headers:

```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' wss://ws.opensuite.com;
```

## Debugging

### Debug Mode

Enable debug mode for detailed logging:

```typescript
const editor = new Editor({
  debug: true,
  logLevel: 'verbose'
});
```

### Performance Monitoring

```typescript
editor.on('performance', (metrics) => {
  console.log('Render time:', metrics.renderTime);
  console.log('Command time:', metrics.commandTime);
  console.log('Memory usage:', metrics.memory);
});
```

### Error Handling

```typescript
editor.on('error', (error) => {
  console.error('Editor error:', error);
  
  // Send to error tracking service
  Sentry.captureException(error);
});
```

## Migration Guide

### From v1 to v2

1. **Plugin API Changes:**
   ```typescript
   // v1
   plugin.register(context);
   
   // v2
   plugin.initialize(context);
   ```

2. **Command Registration:**
   ```typescript
   // v1
   context.commands.register('name', handler);
   
   // v2
   context.registerCommand('name', handler);
   ```

3. **Event Names:**
   ```typescript
   // v1
   context.on('change', handler);
   
   // v2
   context.on('documentChange', handler);
   ```

## Examples

### Example: Custom Highlighter Plugin

```typescript
import { EditorPlugin, PluginContext } from '@opensuite/editor';

export class HighlighterPlugin implements EditorPlugin {
  name = 'highlighter';
  private colors = ['#fef3c7', '#dbeafe', '#dcfce7', '#fce7f3'];
  
  initialize(context: PluginContext) {
    // Add color picker to toolbar
    context.addToolbarButton({
      id: 'highlight',
      icon: 'highlighter',
      tooltip: 'Highlight Text',
      dropdown: this.colors.map(color => ({
        label: color,
        icon: 'circle',
        iconColor: color,
        onClick: () => this.highlight(context, color)
      }))
    });
  }
  
  private highlight(context: PluginContext, color: string) {
    const selection = context.getSelection();
    if (selection.isCollapsed()) {
      context.showToast('Select text to highlight', 'warning');
      return;
    }
    
    context.wrapSelection('mark', {
      style: `background-color: ${color}`
    });
    
    context.showToast('Text highlighted', 'success');
  }
  
  destroy() {}
}
```

### Example: Word Count Plugin

```typescript
import { EditorPlugin, PluginContext } from '@opensuite/editor';

export class WordCountPlugin implements EditorPlugin {
  name = 'word-count';
  
  initialize(context: PluginContext) {
    // Add status bar item
    context.addStatusBarItem({
      id: 'word-count',
      position: 'right',
      render: () => {
        const content = context.getContent();
        const words = content.trim().split(/\s+/).length;
        return `${words} words`;
      }
    });
    
    // Update on document change
    context.on('documentChange', () => {
      context.updateStatusBarItem('word-count');
    });
  }
  
  destroy() {}
}
```

## Resources

- **API Reference:** [API Documentation](./API_DOCUMENTATION.md)
- **User Guide:** [User Manual](./USER_MANUAL.md)
- **Examples:** [GitHub Examples](https://github.com/opensuite/examples)
- **Community:** [Developer Forum](https://community.opensuite.com)
- **Support:** [Developer Support](mailto:dev-support@opensuite.com)

---

**Version:** 2.0  
**Last Updated:** 2024-01-20  
**© OpenSuite 2024**
