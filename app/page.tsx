"use client"
import React, { useState, useRef, useEffect } from "react"
import { User, Copy, Check, Settings, Mic, X } from "lucide-react"
import Image from "next/image"

// ---- Speech Recognition Types ----
interface ISpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  length: number;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => ISpeechRecognition;
    webkitSpeechRecognition?: new () => ISpeechRecognition;
  }
}


type Message = {
  id: number
  type: "user" | "bot"
  content: string
  timestamp: string
}

const GeminiChat: React.FC = () => {
  // State to store all chat messages with id, type (user/bot), content, and timestamp
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      type: "bot",
      content: "Hello! I'm Vision, your AI assistant. How can I help you today?",
      timestamp: new Date().toLocaleTimeString(),
    },
  ])

  const [inputText, setInputText] = useState("") // Text input value stores
  const [loading, setLoading] = useState(false)   // State to track if the AI is currently processing a request (shows loading indicator)
  const messagesEndRef = useRef<HTMLDivElement | null>(null) //scroll bottom upon new msgs
  const inputRef = useRef<HTMLTextAreaElement | null>(null) // Ref to focus on the input field when needed
  const [copied, setCopied] = useState(false);//copy msg symbol
  const [isClearChat, setIsClearChat] = useState(false);// to clear chat confirmation
  const [isDarkMode, setIsDarkMode] = useState(false);// toogle dark theme
  const [showSettings, setShowSettings] = useState(false);// to show settings
  const [isAboutVision, setIsAboutVision] = useState(false);//about vision

  const [isRecording, setIsRecording] = useState<boolean>(false);  // <== Add Recording state
  const recognitionRef = useRef<ISpeechRecognition | null>(null);  // <== Speech Recognition Ref

  const BackendURL = process.env.NEXT_PUBLIC_NEXTAUTH_URL ?? ""

  // Initialize Speech Recognition only once
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setInputText((prev) => (prev ? prev + " " + transcript : transcript));// append voice text to input
      };
      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  // Toggle mic on/off
  const handleMicClick = () => {
    if (!recognitionRef.current) return alert("Speech Recognition not supported");

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  //makes code bg dark , msgs nrml
  const renderMessageContent = (content: string): React.ReactNode => {
    const parts = content.split(/```/);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return (
          <pre key={index} className="bg-gray-800 text-green-400 p-3 rounded-md overflow-x-auto text-sm my-2">
            {part.trim()}
          </pre>
        );
      } else {
        return (
          <p key={index} className="text-md sm:text-md leading-relaxed whitespace-pre-wrap wrap-break-word">
            {part.trim()}
          </p>
        );
      }
    });
  };


  // Function to automatically scroll to the bottom of the chat when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Effect to scroll to bottom whenever messages array changes (new message added)
  useEffect(() => {
    scrollToBottom()
    // inputRef.current?.focus(); // autofocus on textarea after new message
  }, [messages])

  // Main function to handle sending user messages and getting AI responses
  const handleSend = async (): Promise<void> => {
    if (!inputText.trim()) return

    // Create user message object with current timestamp
    const userMessage: Message = {
      id: Date.now(),
      type: "user",
      content: inputText,
      timestamp: new Date().toLocaleTimeString(),
    }

    const prompt = inputText // Store the prompt before clearing input
    // Add user message to chat and clear input
    setMessages((prev) => [...prev, userMessage])
    setInputText("")
    setLoading(true)
    try {
      // Make API call to Gemini endpoint with user prompt and context
      const res = await fetch(`${BackendURL}/api/gemini`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt
        })
      })

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const data = await res.json()

      // Create bot response message with AI's response
      const botMessage: Message = {
        id: Date.now() + 1,
        type: "bot",
        content: data.text,
        timestamp: new Date().toLocaleTimeString(),
      }

      setMessages((prev) => [...prev, botMessage])
    } catch (err) {
      console.error("API Error:", err)
      const errorMessage: Message = {
        id: Date.now() + 1,
        type: "bot",
        content:
          `Sorry, I encountered an error while processing your request. Please redirect to ${BackendURL} and try again.`,
        timestamp: new Date().toLocaleTimeString(),
      }
      setMessages((prev) => [...prev, errorMessage])
    }
    setLoading(false)
  }

  // Function to handle Enter key press in textarea (send message, Shift+Enter for new line)
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

 // Function to clear all messages and reset chat 
const clearChat = async (): Promise<void> => {
    // [Keep the local message clearing logic here]
    setMessages([
      {
        id: 1,
        type: "bot",
        content: "Chat cleared!\n Hello! I'm Vision. How can I help you?",
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);

    try {
        // --- CHANGE THIS LINE ---
        // Instead of /api/gemini/reset, call /api/gemini with a JSON body
        const res = await fetch(`${BackendURL}/api/gemini`, { 
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                action: "reset" // Send the required action payload
            })
        });

        if (!res.ok) {
            throw new Error(`Failed to reset chat on server: ${res.status}`);
        }
        
    } catch (err) {
        console.error("Failed to reset chat session:", err);
    }
    // Set confirmation state back to false if you have a confirmation modal
    // setIsClearChat(false); 
};


  // Function to copy message content to clipboard
  const copyMessage = (content: string) => {
    void navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500); // Reset after 1.5 sec
  };


  return (
    <div className={`min-h-screen ${isDarkMode ? "bg-[#333333]" : "bg-linear-to-br from-emerald-100 via-green-300 to-teal-100"}`}>
      {/* Header */}
      <header className={`backdrop-blur-md  sticky top-0 z-10
  ${isDarkMode
          ? "bg-[#202020] text-white"
          : "bg-linear-to-r from-emerald-500 via-green-400 to-teal-500 text-white border-green-300"}`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12  ">
              <img
                src="/image.png"
                alt="Vision AI Logo"
                className="w-full h-full object-cover object-center rounded-full pt-2 "
              />
            </div>

            <div>
              <h1 className={`text-lg sm:text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}>Vision AI</h1>
              <p className={`text-xs sm:text-sm ${isDarkMode ? "text-white" : "text-gray-800"} hidden sm:block`}>Powered by Gemini AI</p>
            </div>

          </div>

          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-full  transition cursor-pointer"
              title="Settings"
            >
              {showSettings ? (
                <X className={`w-6 h-6 ${isDarkMode ? "text-red-600 " : "text-red-400 "}`} />
              ) : (
                <Settings className={`w-6 h-6 ${isDarkMode ? "text-gray-100" : "text-gray-700"}`} />
              )}
            </button>

            {showSettings && (
              <div className={`absolute right-0 mt-2 w-40 border rounded-lg shadow-lg z-50 font-medium px-2 
  ${isDarkMode ? "bg-gray-700 text-white border-gray-100" : "bg-emerald-200 text-gray-800 border-gray-300"}`}>

                <button
                  onClick={() => { setIsClearChat(true); setShowSettings(false); }}
                  className={`w-full px-4 py-2 text-left text-sm md:text-base transition 
      ${isDarkMode ? "hover:bg-gray-600 " : "hover:bg-emerald-100"}`}>
                  Clear Chat
                </button>

                <button
                  onClick={() => { setIsDarkMode(!isDarkMode); setShowSettings(false); }}
                  className={`w-full px-4 py-2 text-left text-sm md:text-base transition 
      ${isDarkMode ? "hover:bg-gray-600" : "hover:bg-emerald-100"}`}>
                  {isDarkMode ? "Light Theme" : "Dark Theme"}
                </button>
                <button
                  onClick={() => { setIsAboutVision(true); setShowSettings(false); }}
                  className={`w-full px-4 py-2 text-left text-sm md:text-base transition 
  ${isDarkMode ? "hover:bg-gray-600" : "hover:bg-emerald-100"}`}>
                  About Vision
                </button>
                <button
                  onClick={() => {
                    window.open("https://wa.me/9121723149?text=Hello%20Admin", "_blank");
                  }}
                  className={`w-full px-4 py-2 text-left text-sm md:text-base transition mb-2
    ${isDarkMode ? "hover:bg-gray-600" : "hover:bg-emerald-100"}`}>
                  Contact Admin
                </button>

              </div>
            )}
          </div>
        </div>
      </header>

      {/* clearchat form */}
      {isClearChat && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-3 md:p-5 rounded-lg shadow-lg w-95 md:w-110">
            <h2 className="text-lg font-semibold mb-3 text-red-600">Delete Chat History</h2>
            <p className="text-sm text-gray-600 mb-5">
              This will delete your previous chat data (You cant ask follow-up questions). Are you sure you want to continue?
            </p>
            <div className="flex justify-between">
              <button
                onClick={() => setIsClearChat(false)}
                className="px-4 py-2 bg-gray-300 text-gray-900 font-medium rounded-md text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearChat();
                  setIsClearChat(false);
                }}
                className="px-4 py-2 bg-red-500 font-medium text-white rounded-md text-sm"
              >
                Clear Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {isAboutVision && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-3 rounded-lg shadow-lg w-90 md:w-130">
            <h2 className="text-lg font-bold mb-3 text-emerald-600">About Vision</h2>
            <p className="text-sm text-gray-900 mb-5">
              Vision AI is an intelligent chatbot powered by Google Gemini API, developed by Murthy designed to handle follow-up conversations and deliver clean,
              accurate responses. It features code highlighting, copy functionality, input validation, voice input using Speech Recognition, and dark/light theme switching.
              Vision AI ensures a modern, responsive user experience across devices.
              Built using React.js, Node.js, Tailwind CSS, and Gemini API.
            </p>

            <div className="flex justify-end">
              <button
                onClick={() => setIsAboutVision(false)}
                className="px-4 py-2 bg-emerald-500 font-medium text-white rounded-md text-sm"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-1 sm:px-4 lg:px-6 py-1 md:py-3">
        {/* Messaging Section */}
        <section className={`min-h-[75vh] ${isDarkMode ? `bg-gray-750 border-gray-600` : `bg-white/50 border-gray-400`} backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl border  mb-1 md:mb-2 overflow-hidden`}>
          <div className="h-[calc(100vh-25vh)] md:h-[calc(100vh-20vh)] lg:h-157.5 overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"} group`}>
                <div className={`flex items-start space-x-2 sm:space-x-3 max-w-[85%] sm:max-w-[75%] md:max-w-[65%] lg:max-w-[55%] xl:max-w-[50%]`}>

                  {message.type === "bot" && (
                    <div className="hidden sm:flex w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden shrink-0">
                      <Image
                        src="/image.png"
                        alt="logo"
                        width={200}
                        height={200}
                        className="w-full h-full object-cover"
                      />


                    </div>


                  )}

                  <div className={`relative ${message.type === "user" ? "order-first" : ""}`}>
                    <div
                      className={`text-sm sm:text-base px-2 py-1 sm:px-3 sm:py-2 rounded-xl sm:rounded-2xl shadow-sm 
    ${message.type === "user"
                          ? "bg-linear-to-r from-emerald-500 to-green-600 text-white font-medium"
                          : isDarkMode
                            ? "text-gray-300 bg-[#202020] border border-gray-500 font-medium"
                            : "bg-gray-100 border border-gray-400 text-gray-800 font-medium"
                        }`}
                    >
                      {renderMessageContent(message.content)}
                    </div>


                    <div className={`flex items-center space-x-1 sm:space-x-2 mt-1 sm:mt-2 ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                      <span className={`${isDarkMode ? `text-gray-300` : `text-gray-700`} text-xs `}>{message.timestamp}</span>
                      {message.type === "bot" && (
                        <div className="flex space-x-1 opacity-100 transition-opacity">
                          <button onClick={() => copyMessage(message.content)} className={` ${isDarkMode ? `text-gray-300 hover:text-green-300` : `text-gray-700 hover:text-green-600`}p-1  transition-colors cursor-pointer`} title="Copy message">
                            {copied ? (<Check className="w-3 h-3 text-green-500" />) : (<Copy className="w-3 h-3" />)}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {message.type === "user" && (
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-linear-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shrink-0">
                      <User className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center space-x-2 sm:space-x-3 animate-pulse">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full overflow-hidden shadow-md">
                  <img
                    src="/image.png"
                    alt="Vision AI"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className={`${isDarkMode ? `text-emerald-200` : `text-emerald-700`} text-xs sm:text-sm  font-medium`}>Vision is thinking...</div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </section>

        {/* Input Section to send messages*/}
        <section className={`${isDarkMode ? ` bg-[#282828]` : `bg-white/70`}  backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl border border-gray-500 p-2 sm:p-3`}>
          <div className="flex items-end space-x-2 md:space-x-3">
            <div className="flex-1 relative">
              <div className="flex items-center">
                <textarea
                  ref={inputRef}
                  className={`w-full px-3 py-2  sm:px-4 sm:py-3 text-md border border-gray-500 rounded-lg sm:rounded-xl resize-none focus:outline-none focus:ring-2  focus:border-transparent bg-transparent backdrop-blur-sm  ${isDarkMode ? `placeholder-gray-100 text-gray-100 focus:ring-gray-400` : `placeholder-gray-500 text-gray-800 focus:ring-emerald-500`}`}
                  rows={1}
                  placeholder="Type your message here..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                  style={{ minHeight: "40px", maxHeight: "120px" }}
                />
                <div className="flex items-center justify-between mt-1">
                  <span className={` ${isDarkMode ? `text-gray-200` : `text-gray-800`} ml-2 text-xs  whitespace-nowrap`}>{inputText.length}/5000</span>
                  {inputText.length > 5000 && (
                    <span className="text-xs text-red-500 ml-2">Limit exceeded</span>
                  )}
                </div>
              </div>
            </div>

            {/* Mic Button */}
            <button
              onClick={handleMicClick}
              className={`p-2 sm:p-3 rounded-lg sm:rounded-xl 
        ${isRecording ? "bg-red-600" : "bg-linear-to-r from-teal-300 to-teal-500"} 
        text-black shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 cursor-pointer`}
              title="Voice Input"
            >
              <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              onClick={handleSend}
              disabled={loading || !inputText.trim() || inputText.length > 5000}
              className="p-2 sm:p-3 bg-linear-to-r from-emerald-500 to-green-600 text-white rounded-lg sm:rounded-xl hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 shrink-0 cursor-pointer"
            >
              {loading ? (
                <span className="text-xs sm:text-sm font-medium px-1">Wait</span>
              ) : (
                <span className="text-xs sm:text-sm font-medium px-1">Send</span>
              )}
            </button>

          </div>
        </section>
        <p className={`text-xs  mt-2 text-center ${isDarkMode ? "text-white" : "text-gray-800"} `}>
          Vision can make mistakes. Check important info only.
        </p>

      </div>

    </div>
  )
}

export default GeminiChat
