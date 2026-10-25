import { useState, useEffect } from 'react';
import { getCollaborationService, Collaborator } from '../services/collaboration';
import { Wifi, WifiOff, Users } from 'lucide-react';

export default function CollaborationBar() {
  const [status, setStatus] = useState<string>('disconnected');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const service = getCollaborationService();

  useEffect(() => {
    const unsub1 = service.on('status:change', setStatus);
    const unsub2 = service.on('collaborators:change', setCollaborators);
    
    // Initial state
    setStatus(service.isConnected() ? 'connected' : 'disconnected');
    setCollaborators(service.getCollaborators());
    
    return () => { unsub1(); unsub2(); };
  }, []);

  if (status === 'disconnected' && collaborators.length === 0) {
    return null; // Not in collaboration mode
  }

  return (
    <div className="flex items-center gap-3 px-3 py-1 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      {/* Connection status */}
      <div className="flex items-center gap-1.5">
        {status === 'connected' ? (
          <Wifi className="w-3.5 h-3.5 text-green-500" />
        ) : (
          <WifiOff className="w-3.5 h-3.5 text-red-500" />
        )}
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {status === 'connected' ? 'Connected' : status === 'connecting' ? 'Connecting...' : 'Disconnected'}
        </span>
      </div>

      {/* Collaborators */}
      {collaborators.length > 0 && (
        <div className="flex items-center gap-2 ml-auto">
          <div className="flex -space-x-2">
            {collaborators.slice(0, 5).map((user, i) => (
              <div
                key={user.userId || i}
                className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center text-[10px] font-bold text-white"
                style={{ backgroundColor: user.color }}
                title={user.userName}
              >
                {user.userName.charAt(0).toUpperCase()}
              </div>
            ))}
            {collaborators.length > 5 && (
              <div className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-900 bg-gray-400 flex items-center justify-center text-[10px] font-bold text-white">
                +{collaborators.length - 5}
              </div>
            )}
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Users className="w-3 h-3" />
            {collaborators.length + 1} editing
          </span>
        </div>
      )}
    </div>
  );
}
