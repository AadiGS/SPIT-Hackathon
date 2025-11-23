import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X, MessageSquare, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '../../../contexts/AuthContext';
import { useChatbot } from '../../../contexts/ChatbotContext';

const API_BASE_URL = 'http://localhost:8003';

/**
 * FloatingAIChatbot Component
 * 
 * Context-aware AI chatbot that uses page data to provide insights.
 * Gets page data from ChatbotContext.
 */
export default function FloatingAIChatbot() {
    const { user } = useAuth();
    const { pageData } = useChatbot();
    const pageName = pageData.pageName || "Dashboard";
    const pageDataObj = pageData.data || {};
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);
    const hasLoadedHistory = useRef(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Load chat history when chatbot opens
    const loadChatHistory = async () => {
        if (!user || hasLoadedHistory.current) return;
        
        setIsLoadingHistory(true);
        try {
            const response = await fetch(`${API_BASE_URL}/chat/history`, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                const history = data.messages || [];
                
                if (history.length > 0) {
                    // Convert backend messages to UI format
                    const formattedMessages = history.map((msg, idx) => ({
                        id: Date.now() + idx,
                        role: msg.role,
                        content: msg.content
                    }));
                    setMessages(formattedMessages);
                } else {
                    // No history, show welcome message
                    setMessages([{
                        id: 1,
                        role: 'assistant',
                        content: `Hello! I'm your AI Analytics Assistant for the ${pageName}. I can help you understand your data, trends, and make data-driven decisions. What would you like to know?`
                    }]);
                }
                
                hasLoadedHistory.current = true;
            } else {
                // If history fails, show welcome message
                setMessages([{
                    id: 1,
                    role: 'assistant',
                    content: `Hello! I'm your AI Analytics Assistant for the ${pageName}. I can help you understand your data, trends, and make data-driven decisions. What would you like to know?`
                }]);
            }
        } catch (err) {
            console.error('Failed to load chat history:', err);
            // On error, show welcome message
            setMessages([{
                id: 1,
                role: 'assistant',
                content: `Hello! I'm your AI Analytics Assistant for the ${pageName}. I can help you understand your data, trends, and make data-driven decisions. What would you like to know?`
            }]);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    // Load history when chatbot opens for the first time
    useEffect(() => {
        if (isOpen && !hasLoadedHistory.current) {
            loadChatHistory();
        }
    }, [isOpen]);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
        };
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = {
            id: Date.now(),
            role: 'user',
            content: input
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/chat/message`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    question: input,
                    current_page: pageName,
                    page_data: pageDataObj
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to get response');
            }

            const data = await response.json();

            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                role: 'assistant',
                content: data.answer
            }]);

        } catch (err) {
            console.error('Chat error:', err);
            setError(err.message);
            
            // Show error message to user
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                role: 'assistant',
                content: `Sorry, I encountered an error: ${err.message}. ${err.message.includes('LM Studio') ? 'Please make sure LM Studio is running on http://127.0.0.1:1234' : ''}`
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearHistory = async () => {
        if (!confirm('Are you sure you want to clear your chat history?')) return;

        try {
            const response = await fetch(`${API_BASE_URL}/chat/history`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (response.ok) {
                setMessages([{
                    id: 1,
                    role: 'assistant',
                    content: `Hello! I'm your AI Analytics Assistant for the ${pageName}. How can I help you today?`
                }]);
                hasLoadedHistory.current = false; // Allow reloading history
            }
        } catch (err) {
            console.error('Failed to clear history:', err);
        }
    };

    return (
        <>
            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-card rounded-lg border border-border shadow-2xl flex flex-col z-50">
                    {/* Header */}
                    <div className="p-4 border-b border-border flex items-center justify-between bg-background/50 rounded-t-lg">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm text-gray-900 dark:text-white">AI Analyst</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {pageName}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleClearHistory}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                                title="Clear chat history"
                            >
                                <Trash2 className="h-4 w-4 text-gray-500" />
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                            >
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {isLoadingHistory ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                                    <p className="text-sm text-gray-500">Loading chat history...</p>
                                </div>
                            </div>
                        ) : (
                            <>
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={cn(
                                    "flex gap-2 max-w-[85%]",
                                    msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                                )}
                            >
                                <div className={cn(
                                    "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                                    msg.role === 'user'
                                        ? "bg-blue-600 text-white"
                                        : "bg-secondary text-secondary-foreground"
                                )}>
                                    {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                                </div>
                                <div className={cn(
                                    "p-3 rounded-2xl text-sm",
                                    msg.role === 'user'
                                        ? "bg-blue-600 text-white rounded-tr-none"
                                        : "bg-secondary text-secondary-foreground rounded-tl-none"
                                )}>
                                    <p className="whitespace-pre-wrap leading-relaxed text-xs">{msg.content}</p>
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex gap-2 max-w-[85%]">
                                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                                    <Bot className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="bg-secondary p-3 rounded-2xl rounded-tl-none flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                            </>
                        )}
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSend} className="p-3 border-t border-border bg-card rounded-b-lg">
                        {error && (
                            <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-600 dark:text-red-400">
                                {error}
                            </div>
                        )}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask me about your data..."
                                className="flex-1 px-3 py-2 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-50"
                title="Ask AI Assistant"
            >
                {isOpen ? (
                    <X className="h-6 w-6" />
                ) : (
                    <MessageSquare className="h-6 w-6" />
                )}
            </button>
        </>
    );
}
