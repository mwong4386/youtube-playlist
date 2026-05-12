import React, { useState, useRef, useEffect } from "react";
import styles from "./GeminiAgentChat.module.css";
import MsgType from "../../constants/msgType";
import type {
  AgenticChatMessage,
  AgenticChatRequest,
  AgenticChatResponse,
} from "../../models/GeminiActions";

const GeminiAgentChat: React.FC = () => {
  const [history, setHistory] = useState<AgenticChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatHistoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [history, isLoading]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: AgenticChatMessage = {
      role: "USER",
      content: inputValue.trim(),
    };

    const newHistory = [...history, userMessage];
    setHistory(newHistory);
    setInputValue("");
    setIsLoading(true);

    const request: AgenticChatRequest = {
      history,
      userRequest: userMessage.content,
    };

    try {
      const response: AgenticChatResponse = await chrome.runtime.sendMessage({
        name: MsgType.AgenticChatRequest,
        ...request,
      });

      if (response && response.ok) {
        setHistory(response.history);
      } else {
        const errorMessage: AgenticChatMessage = {
          role: "MODEL",
          content: `Error: ${response?.message || "Unknown error"}`,
        };
        setHistory([...newHistory, errorMessage]);
      }
    } catch (error) {
      const errorMessage: AgenticChatMessage = {
        role: "MODEL",
        content: `Connection error: ${error instanceof Error ? error.message : String(error)}`,
      };
      setHistory([...newHistory, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.chatHistory} ref={chatHistoryRef}>
        {history.length === 0 && (
          <p className={styles.loading} style={{ textAlign: "center", padding: "20px", opacity: 0.7 }}>
            Try experimental Agentic Chat! Gemini can help you manage your playlist or answer questions.
          </p>
        )}
        {history.map((msg, index) => (
          <div
            key={index}
            className={`${styles.message} ${
              msg.role.toUpperCase() === "USER" ? styles.user : styles.model
            }`}
          >
            {msg.content}
          </div>
        ))}
        {isLoading && <div className={styles.loading}>Gemini is thinking...</div>}
      </div>
      <div className={styles.inputArea}>
        <textarea
          className={styles.textarea}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Gemini anything..."
          rows={1}
        />
        <button
          className={styles.sendButton}
          onClick={handleSend}
          disabled={isLoading || !inputValue.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default GeminiAgentChat;
