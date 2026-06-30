import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { fetchLiveAIResponse } from "../utils/api";
import "./ChatInterface.css";

type Role = "user" | "assistant";

interface Message {
  id: string;
  role: Role;
  text: string;
}

let idCounter = 0;

/** Generate a stable unique id for a message. */
function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  idCounter += 1;
  return `msg-${idCounter}`;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the conversation scrolled to the latest message.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    const prompt = input.trim();
    // Guard: ignore empty input or a send while a request is already in flight.
    if (!prompt || isLoading) {
      return;
    }

    const userMessage: Message = {
      id: createId(),
      role: "user",
      text: prompt,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setError(null);
    setIsLoading(true);

    try {
      const reply = await fetchLiveAIResponse(prompt);
      setMessages((prev) => [
        ...prev,
        { id: createId(), role: "assistant", text: reply },
      ]);
    } catch (err) {
      // Keep prior messages intact; surface a friendly inline error.
      const detail =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(`Failed to get a response: ${detail}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift+Enter inserts a newline.
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const canSend = input.trim().length > 0 && !isLoading;

  return (
    <div className="chat">
      <header className="chat-header">
        <h1>AI Chat</h1>
      </header>

      <div className="chat-log" ref={scrollRef}>
        {messages.length === 0 && !isLoading && (
          <p className="chat-empty">Start the conversation below.</p>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`chat-bubble chat-bubble--${message.role}`}
          >
            <span className="chat-role">
              {message.role === "user" ? "You" : "AI"}
            </span>
            {message.role === "assistant" ? (
              <div className="chat-text chat-markdown">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.text}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="chat-text">{message.text}</p>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="chat-bubble chat-bubble--assistant chat-bubble--pending">
            <span className="chat-role">AI</span>
            <p className="chat-text">Thinking…</p>
          </div>
        )}
      </div>

      {error && (
        <div className="chat-error" role="alert">
          {error}
        </div>
      )}

      <div className="chat-input-row">
        <textarea
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
          rows={2}
          disabled={isLoading}
        />
        <button
          type="button"
          className="chat-send"
          onClick={() => void handleSend()}
          disabled={!canSend}
        >
          {isLoading ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}
