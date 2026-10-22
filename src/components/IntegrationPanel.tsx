import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, Code, Globe, Webhook, Shield } from 'lucide-react';

interface IntegrationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function IntegrationPanel({ isOpen, onClose }: IntegrationPanelProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'embed' | 'api' | 'webhook'>('embed');

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const embedCode = `<iframe
  src="${window.location.origin}"
  width="100%"
  height="600"
  frameborder="0"
  allowfullscreen
></iframe>`;

  const apiCode = `// OpenSuite API Integration
const response = await fetch('${window.location.origin}/api/documents', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    name: 'My Document',
    type: 'docx',
    content: '<p>Hello World</p>'
  })
});

const document = await response.json();
console.log(document.id);`;

  const webhookCode = `// Webhook Configuration
// POST ${window.location.origin}/api/webhooks
{
  "events": ["document.created", "document.updated", "document.deleted"],
  "url": "https://your-app.com/webhook",
  "secret": "your_webhook_secret"
}

// Webhook Payload Example
{
  "event": "document.updated",
  "document": {
    "id": "doc_123",
    "name": "My Document.docx",
    "type": "docx",
    "modified_at": "2024-01-15T10:30:00Z"
  }
}`;

  const jsSDKCode = `// JavaScript SDK
import { OpenSuite } from '@opensuite/sdk';

const client = new OpenSuite({
  apiKey: 'YOUR_API_KEY',
  baseUrl: '${window.location.origin}'
});

// Create a document
const doc = await client.documents.create({
  name: 'Report.docx',
  type: 'docx'
});

// Open in editor
client.editor.open(doc.id, {
  container: '#editor',
  mode: 'edit', // or 'view'
  callback: (data) => {
    console.log('Document saved:', data);
  }
});`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Integration & API</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('embed')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'embed'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Code className="w-4 h-4" />
            Embed
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'api'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <ExternalLink className="w-4 h-4" />
            REST API
          </button>
          <button
            onClick={() => setActiveTab('webhook')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'webhook'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Webhook className="w-4 h-4" />
            Webhooks
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'embed' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Embed in your application
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  Add OpenSuite to your app using an iframe. Users can create and edit documents directly in your interface.
                </p>
                <div className="relative">
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                    <code>{embedCode}</code>
                  </pre>
                  <button
                    onClick={() => copyToClipboard(embedCode, 0)}
                    className="absolute top-2 right-2 p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
                  >
                    {copiedIndex === 0 ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  URL Parameters
                </h3>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-sm space-y-2">
                  <div className="flex gap-2">
                    <code className="text-blue-600 dark:text-blue-400 font-mono">?file=</code>
                    <span className="text-gray-600 dark:text-gray-400">URL to a document to open</span>
                  </div>
                  <div className="flex gap-2">
                    <code className="text-blue-600 dark:text-blue-400 font-mono">?mode=</code>
                    <span className="text-gray-600 dark:text-gray-400">edit or view</span>
                  </div>
                  <div className="flex gap-2">
                    <code className="text-blue-600 dark:text-blue-400 font-mono">?callback=</code>
                    <span className="text-gray-600 dark:text-gray-400">URL for save callback</span>
                  </div>
                  <div className="flex gap-2">
                    <code className="text-blue-600 dark:text-blue-400 font-mono">?token=</code>
                    <span className="text-gray-600 dark:text-gray-400">Authentication token</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  JavaScript SDK
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  Use our JavaScript SDK for seamless integration.
                </p>
                <div className="relative">
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                    <code>{jsSDKCode}</code>
                  </pre>
                  <button
                    onClick={() => copyToClipboard(jsSDKCode, 1)}
                    className="absolute top-2 right-2 p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
                  >
                    {copiedIndex === 1 ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  REST API
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  Direct API access for server-side integration.
                </p>
                <div className="relative">
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                    <code>{apiCode}</code>
                  </pre>
                  <button
                    onClick={() => copyToClipboard(apiCode, 2)}
                    className="absolute top-2 right-2 p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
                  >
                    {copiedIndex === 2 ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Endpoints
                </h3>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden text-sm">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-400">Method</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-400">Endpoint</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-400">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      <tr>
                        <td className="px-4 py-2"><span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-mono">GET</span></td>
                        <td className="px-4 py-2 font-mono text-xs">/api/documents</td>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">List all documents</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2"><span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-mono">POST</span></td>
                        <td className="px-4 py-2 font-mono text-xs">/api/documents</td>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">Create a document</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2"><span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-mono">GET</span></td>
                        <td className="px-4 py-2 font-mono text-xs">/api/documents/:id</td>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">Get document</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2"><span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded text-xs font-mono">PUT</span></td>
                        <td className="px-4 py-2 font-mono text-xs">/api/documents/:id</td>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">Update document</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2"><span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-xs font-mono">DEL</span></td>
                        <td className="px-4 py-2 font-mono text-xs">/api/documents/:id</td>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">Delete document</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2"><span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-mono">POST</span></td>
                        <td className="px-4 py-2 font-mono text-xs">/api/convert</td>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">Convert between formats</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'webhook' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Webhook Configuration
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  Get notified when documents are created, updated, or deleted.
                </p>
                <div className="relative">
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                    <code>{webhookCode}</code>
                  </pre>
                  <button
                    onClick={() => copyToClipboard(webhookCode, 3)}
                    className="absolute top-2 right-2 p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
                  >
                    {copiedIndex === 3 ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Available Events
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'document.created',
                    'document.updated',
                    'document.deleted',
                    'document.shared',
                    'document.exported',
                    'document.imported',
                  ].map(event => (
                    <div key={event} className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <code className="text-gray-700 dark:text-gray-300 font-mono text-xs">{event}</code>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <Shield className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300">Security</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                    All webhook payloads are signed with HMAC-SHA256. Verify the signature using your webhook secret to ensure authenticity.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
