import React, { createContext, useContext, useState } from 'react';

const ChatbotContext = createContext();

export function ChatbotProvider({ children }) {
    const [pageData, setPageData] = useState({
        pageName: 'Dashboard',
        data: {}
    });

    const updatePageData = (pageName, data) => {
        setPageData({ pageName, data });
    };

    return (
        <ChatbotContext.Provider value={{ pageData, updatePageData }}>
            {children}
        </ChatbotContext.Provider>
    );
}

export function useChatbot() {
    const context = useContext(ChatbotContext);
    if (!context) {
        throw new Error('useChatbot must be used within ChatbotProvider');
    }
    return context;
}

