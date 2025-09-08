import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const ChatComponent = ({ studentId, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatRoom, setChatRoom] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingFile, setUploadingFile] = useState(false);
  
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize chat room and WebSocket connection
  useEffect(() => {
    if (!studentId) return;

    const initializeChat = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        
        // Get or create chat room for this student
        const response = await axios.get(
          `http://127.0.0.1:8000/api/chat/student/${studentId}/`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        setChatRoom(response.data);
        
        // Get initial messages
        const messagesResponse = await axios.get(
          `http://127.0.0.1:8000/api/chat/rooms/${response.data.id}/messages/`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        setMessages(messagesResponse.data);
        
        // Connect to WebSocket
        connectWebSocket(response.data.id, token);
        
      } catch (error) {
        console.error('Error initializing chat:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeChat();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [studentId]);

  const connectWebSocket = (roomId, token) => {
    try {
      // Connect to WebSocket with authentication
      const wsUrl = `ws://127.0.0.1:8000/ws/chat/${roomId}/?token=${token}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        
        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          if (roomId && token) {
            connectWebSocket(roomId, token);
          }
        }, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
    }
  };

  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'chat_message':
        setMessages(prev => [...prev, data.message]);
        break;
      case 'typing_indicator':
        setIsTyping(prev => ({
          ...prev,
          [data.username]: data.is_typing
        }));
        break;
      case 'message_read':
        // Handle read receipts if needed
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatRoom || !isConnected) return;

    try {
      // Send message via WebSocket
      wsRef.current.send(JSON.stringify({
        type: 'chat_message',
        content: newMessage,
        message_type: 'text'
      }));

      setNewMessage('');
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Fallback to REST API if WebSocket fails
      try {
        const token = localStorage.getItem('token');
        const response = await axios.post(
          `http://127.0.0.1:8000/api/chat/rooms/${chatRoom.id}/send_message/`,
          { content: newMessage, message_type: 'text' },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        setMessages(prev => [...prev, response.data]);
        setNewMessage('');
        
      } catch (apiError) {
        console.error('Error sending message via API:', apiError);
        alert('Failed to send message. Please try again.');
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else {
      // Send typing indicator
      if (wsRef.current && isConnected) {
        wsRef.current.send(JSON.stringify({
          type: 'typing',
          is_typing: true
        }));

        // Clear previous timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        // Stop typing indicator after 2 seconds
        typingTimeoutRef.current = setTimeout(() => {
          if (wsRef.current && isConnected) {
            wsRef.current.send(JSON.stringify({
              type: 'typing',
              is_typing: false
            }));
          }
        }, 2000);
      }
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !chatRoom) return;

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    try {
      setUploadingFile(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(
        `http://127.0.0.1:8000/api/chat/rooms/${chatRoom.id}/upload_file/`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setMessages(prev => [...prev, response.data]);
      
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const isImageFile = (url) => {
    return url && (url.includes('image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(url));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading chat...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-96 bg-white border rounded-lg">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div>
          <h3 className="font-semibold text-gray-800">
            Discussion for {chatRoom?.student_name}
          </h3>
          <p className="text-sm text-gray-500">
            {chatRoom?.participants?.length} participants
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-xs text-gray-500">
            {isConnected ? 'Connected' : 'Connecting...'}
          </span>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwnMessage = message.sender.id === currentUser.id;
            const showDate = index === 0 || 
              formatDate(message.created_at) !== formatDate(messages[index - 1]?.created_at);

            return (
              <div key={message.id}>
                {/* Date separator */}
                {showDate && (
                  <div className="text-center text-xs text-gray-400 my-4">
                    {formatDate(message.created_at)}
                  </div>
                )}

                {/* Message */}
                <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isOwnMessage 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-800'
                  }`}>
                    {!isOwnMessage && (
                      <div className="text-xs font-semibold mb-1">
                        {message.sender.username} ({message.sender.role})
                      </div>
                    )}
                    
                    {/* Text content */}
                    {message.message_type === 'text' && (
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    )}
                    
                    {/* Image content */}
                    {message.message_type === 'image' && (
                      <div>
                        <img 
                          src={message.file_url} 
                          alt={message.file_name}
                          className="max-w-full rounded mb-2"
                          style={{ maxHeight: '200px' }}
                        />
                        <div className="text-xs opacity-75">
                          {message.file_name}
                        </div>
                      </div>
                    )}
                    
                    {/* File content */}
                    {message.message_type === 'file' && (
                      <div>
                        <a 
                          href={message.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={`flex items-center gap-2 ${
                            isOwnMessage ? 'text-blue-200' : 'text-blue-600'
                          } hover:underline`}
                        >
                          📄 {message.file_name}
                        </a>
                        <div className="text-xs opacity-75 mt-1">
                          {(message.file_size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                    )}
                    
                    <div className={`text-xs mt-1 ${
                      isOwnMessage ? 'text-blue-200' : 'text-gray-500'
                    }`}>
                      {formatTime(message.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicators */}
        {Object.entries(isTyping).filter(([user, typing]) => typing).map(([user]) => (
          <div key={user} className="flex justify-start">
            <div className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg">
              <div className="text-xs font-semibold mb-1">{user}</div>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile || !isConnected}
            className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
            title="Upload file"
          >
            {uploadingFile ? '⏳' : '📎'}
          </button>
          
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isConnected ? "Type a message..." : "Connecting..."}
            disabled={!isConnected}
            className="flex-1 p-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            rows="1"
            style={{ minHeight: '2.5rem' }}
          />
          
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || !isConnected}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatComponent;
