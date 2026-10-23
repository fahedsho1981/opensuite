import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check, HelpCircle, BookOpen, MessageCircle, Lightbulb } from 'lucide-react';

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: () => void;
}

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: 'Welcome to OpenSuite!',
    description: 'Create professional documents with real-time collaboration, powerful editing tools, and seamless cloud integration.',
    icon: <BookOpen className="w-12 h-12 text-blue-500" />,
  },
  {
    title: 'Create Your First Document',
    description: 'Click "New Document" to get started. Choose from templates or start with a blank canvas.',
    icon: <Lightbulb className="w-12 h-12 text-yellow-500" />,
  },
  {
    title: 'Powerful Editing Tools',
    description: 'Format text, insert images, create tables, and more with our intuitive toolbar. Use keyboard shortcuts for faster editing.',
    icon: <HelpCircle className="w-12 h-12 text-green-500" />,
  },
  {
    title: 'Real-time Collaboration',
    description: 'Share documents with team members and work together in real-time. See changes instantly and leave comments.',
    icon: <MessageCircle className="w-12 h-12 text-purple-500" />,
  },
  {
    title: 'You\'re All Set!',
    description: 'Start creating amazing documents. Remember: your work is automatically saved, and you can access it from anywhere.',
    icon: <Check className="w-12 h-12 text-blue-500" />,
  },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
    onClose();
  };

  const step = ONBOARDING_STEPS[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Getting Started</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 text-center">
          <div className="mb-6 flex justify-center">
            {step.icon}
          </div>
          <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
          <p className="text-gray-600 leading-relaxed">{step.description}</p>
        </div>

        {/* Progress Indicator */}
        <div className="px-8 pb-4">
          <div className="flex justify-center space-x-2">
            {ONBOARDING_STEPS.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-blue-500 w-8'
                    : index < currentStep
                    ? 'bg-blue-300'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <button
            onClick={handleSkip}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Skip tour
          </button>
          <div className="flex space-x-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
            >
              {currentStep === ONBOARDING_STEPS.length - 1 ? 'Get Started' : 'Next'}
              {currentStep < ONBOARDING_STEPS.length - 1 && (
                <ChevronRight className="w-4 h-4 ml-1" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Help Center Component
interface HelpCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpCenter: React.FC<HelpCenterProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'search' | 'articles' | 'contact'>('search');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const helpArticles = [
    { id: 'getting-started', title: 'Getting Started', category: 'Basics' },
    { id: 'formatting-text', title: 'Formatting Text', category: 'Editing' },
    { id: 'collaboration', title: 'Real-time Collaboration', category: 'Collaboration' },
    { id: 'keyboard-shortcuts', title: 'Keyboard Shortcuts', category: 'Productivity' },
    { id: 'troubleshooting', title: 'Troubleshooting', category: 'Support' },
  ];

  const filteredArticles = searchQuery
    ? helpArticles.filter(article =>
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : helpArticles;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold flex items-center">
            <HelpCircle className="w-5 h-5 mr-2 text-blue-500" />
            Help Center
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'search'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Search
          </button>
          <button
            onClick={() => setActiveTab('articles')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'articles'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Articles
          </button>
          <button
            onClick={() => setActiveTab('contact')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'contact'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Contact Support
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'search' && (
            <div>
              <input
                type="text"
                placeholder="Search for help articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <div className="mt-4 space-y-2">
                {filteredArticles.map((article) => (
                  <button
                    key={article.id}
                    className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <div className="font-medium">{article.title}</div>
                    <div className="text-sm text-gray-500 mt-1">{article.category}</div>
                  </button>
                ))}
                {filteredArticles.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    No articles found. Try a different search term.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'articles' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg mb-4">Popular Articles</h3>
              {helpArticles.map((article) => (
                <button
                  key={article.id}
                  className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{article.title}</div>
                      <div className="text-sm text-gray-500 mt-1">{article.category}</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Contact Support</h3>
              <p className="text-gray-600">
                Need help? Our support team is here to assist you.
              </p>
              <div className="space-y-3">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="font-medium mb-1">Email Support</div>
                  <div className="text-sm text-gray-600">support@opensuite.com</div>
                  <div className="text-xs text-gray-500 mt-1">Response within 24 hours</div>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="font-medium mb-1">Live Chat</div>
                  <div className="text-sm text-gray-600">Available Monday-Friday, 9am-5pm EST</div>
                  <button className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm">
                    Start Chat
                  </button>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="font-medium mb-1">Community Forum</div>
                  <div className="text-sm text-gray-600">Get help from other users</div>
                  <button className="mt-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                    Visit Forum
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Keyboard Shortcuts Modal
interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { category: 'General', items: [
      { keys: ['Ctrl', 'S'], description: 'Save document' },
      { keys: ['Ctrl', 'Z'], description: 'Undo' },
      { keys: ['Ctrl', 'Y'], description: 'Redo' },
      { keys: ['Ctrl', 'F'], description: 'Find' },
      { keys: ['Ctrl', 'H'], description: 'Find and replace' },
    ]},
    { category: 'Formatting', items: [
      { keys: ['Ctrl', 'B'], description: 'Bold' },
      { keys: ['Ctrl', 'I'], description: 'Italic' },
      { keys: ['Ctrl', 'U'], description: 'Underline' },
      { keys: ['Ctrl', 'Shift', '>'], description: 'Increase font size' },
      { keys: ['Ctrl', 'Shift', '<'], description: 'Decrease font size' },
    ]},
    { category: 'Navigation', items: [
      { keys: ['Ctrl', 'Home'], description: 'Go to beginning' },
      { keys: ['Ctrl', 'End'], description: 'Go to end' },
      { keys: ['Ctrl', 'G'], description: 'Go to page' },
      { keys: ['Ctrl', '/'], description: 'Show shortcuts' },
    ]},
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {shortcuts.map((category) => (
              <div key={category.category}>
                <h3 className="font-semibold text-lg mb-3 text-gray-700">{category.category}</h3>
                <div className="space-y-2">
                  {category.items.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <span className="text-gray-700">{shortcut.description}</span>
                      <div className="flex items-center space-x-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <React.Fragment key={keyIndex}>
                            <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-white border border-gray-300 rounded shadow-sm">
                              {key}
                            </kbd>
                            {keyIndex < shortcut.keys.length - 1 && (
                              <span className="text-gray-400">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <p className="text-sm text-gray-600 text-center">
            Press <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-white border border-gray-300 rounded">Ctrl</kbd> + <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-white border border-gray-300 rounded">/</kbd> to show this dialog
          </p>
        </div>
      </div>
    </div>
  );
};
