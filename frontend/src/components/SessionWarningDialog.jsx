import React from 'react';

const SessionWarningDialog = ({ 
  showWarning, 
  timeLeft, 
  onContinueSession, 
  onLogoutNow 
}) => {
  if (!showWarning) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center mb-4">
          <div className="bg-yellow-100 p-2 rounded-full mr-3">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Session Expiring Soon</h3>
        </div>
        
        <p className="text-gray-600 mb-4">
          Your session will expire in{' '}
          <span className="font-bold text-red-600">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
          . Would you like to continue your session?
        </p>
        
        <div className="flex space-x-3">
          <button
            onClick={onContinueSession}
            className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            Continue Session
          </button>
          <button
            onClick={onLogoutNow}
            className="flex-1 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
          >
            Logout Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionWarningDialog;
