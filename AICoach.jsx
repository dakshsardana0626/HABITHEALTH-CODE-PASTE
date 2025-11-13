import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, Send, Sparkles, Plus, MessageCircle, 
  Clock, Trash2, Edit3
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

export default function AICoach() {
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  useEffect(() => {
    if (activeConversation) {
      const unsubscribe = base44.agents.subscribeToConversation(
        activeConversation.id,
        (data) => {
          setMessages(data.messages || []);
        }
      );

      return () => unsubscribe();
    }
  }, [activeConversation]);

  const loadConversations = async () => {
    try {
      const convos = await base44.agents.listConversations({
        agent_name: 'health_coach'
      });
      setConversations(convos || []);
      
      if (convos && convos.length > 0 && !activeConversation) {
        setActiveConversation(convos[0]);
        setMessages(convos[0].messages || []);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const handleNewConversation = async () => {
    try {
      const newConvo = await base44.agents.createConversation({
        agent_name: 'health_coach',
        metadata: {
          name: `Chat ${format(new Date(), 'MMM d, h:mm a')}`,
          description: 'Health coaching conversation'
        }
      });
      
      setConversations(prev => [newConvo, ...prev]);
      setActiveConversation(newConvo);
      setMessages([]);
      toast.success('New conversation started');
    } catch (error) {
      toast.error('Error creating conversation');
      console.error(error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !activeConversation || isSending) return;

    const messageText = inputMessage;
    setInputMessage('');
    setIsSending(true);

    try {
      await base44.agents.addMessage(activeConversation, {
        role: 'user',
        content: messageText
      });
    } catch (error) {
      toast.error('Error sending message');
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickPrompts = [
    "What should I eat for breakfast today?",
    "Review my progress this week",
    "Suggest healthier alternatives to my favorite foods",
    "How can I stay motivated?",
    "Help me plan meals for tomorrow"
  ];

  return (
    <div className="h-[calc(100vh-12rem)] max-w-7xl mx-auto flex gap-6">
      {/* Conversations Sidebar */}
      <div className="w-80 flex-shrink-0">
        <Card className="h-full flex flex-col bg-white/80 backdrop-blur-sm border-none shadow-xl">
          <div className="p-6 border-b">
            <Button
              onClick={handleNewConversation}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {conversations.map((convo) => (
              <button
                key={convo.id}
                onClick={() => {
                  setActiveConversation(convo);
                  setMessages(convo.messages || []);
                }}
                className={cn(
                  "w-full p-4 rounded-2xl text-left transition-all",
                  activeConversation?.id === convo.id
                    ? "bg-gradient-to-r from-blue-100 to-cyan-100 border-2 border-blue-300"
                    : "bg-slate-50 hover:bg-slate-100"
                )}
              >
                <div className="flex items-start gap-3">
                  <MessageCircle className={cn(
                    "w-5 h-5 flex-shrink-0 mt-0.5",
                    activeConversation?.id === convo.id ? "text-blue-600" : "text-slate-400"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-semibold truncate",
                      activeConversation?.id === convo.id ? "text-blue-800" : "text-slate-800"
                    )}>
                      {convo.metadata?.name || 'Conversation'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {convo.messages?.length || 0} messages
                    </p>
                  </div>
                </div>
              </button>
            ))}

            {conversations.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No conversations yet</p>
              </div>
            )}
          </div>

          {/* WhatsApp Connect */}
          <div className="p-4 border-t bg-gradient-to-br from-green-50 to-emerald-50">
            <p className="text-xs text-slate-600 mb-2 font-medium">Chat on the go</p>
            <a 
              href={base44.agents.getWhatsAppConnectURL('health_coach')} 
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button variant="outline" className="w-full border-green-600 text-green-600 hover:bg-green-50">
                💬 Connect WhatsApp
              </Button>
            </a>
          </div>
        </Card>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <Card className="flex-1 flex flex-col bg-white/80 backdrop-blur-sm border-none shadow-xl overflow-hidden">
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-6 border-b bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">AI Health Trainer</h2>
                    <p className="text-blue-100 text-sm">Your personal health companion</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center max-w-md">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="w-8 h-8 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 mb-2">
                        Start Your Conversation
                      </h3>
                      <p className="text-slate-600 mb-6">
                        I'm here to help with nutrition advice, workout tips, motivation, and answer any health questions!
                      </p>
                      
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-slate-700 mb-3">Try asking:</p>
                        {quickPrompts.slice(0, 3).map((prompt, idx) => (
                          <button
                            key={idx}
                            onClick={() => setInputMessage(prompt)}
                            className="block w-full text-left p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-sm text-slate-700 transition-colors"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  messages.map((message, idx) => {
                    const isUser = message.role === 'user';
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "flex gap-3",
                          isUser ? "justify-end" : "justify-start"
                        )}
                      >
                        {!isUser && (
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                            <Bot className="w-5 h-5 text-white" />
                          </div>
                        )}
                        <div
                          className={cn(
                            "max-w-[70%] rounded-2xl px-4 py-3",
                            isUser
                              ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white"
                              : "bg-slate-100 text-slate-800"
                          )}
                        >
                          {isUser ? (
                            <p className="text-sm leading-relaxed">{message.content}</p>
                          ) : (
                            <ReactMarkdown
                              className="text-sm prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                              components={{
                                p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
                                ul: ({ children }) => <ul className="my-2 ml-4 list-disc space-y-1">{children}</ul>,
                                ol: ({ children }) => <ol className="my-2 ml-4 list-decimal space-y-1">{children}</ol>,
                                li: ({ children }) => <li className="my-0.5">{children}</li>,
                                strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          )}
                        </div>
                        {isUser && (
                          <div className="w-8 h-8 rounded-xl bg-slate-700 flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm">
                            {user?.full_name?.[0] || 'U'}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Input */}
              <div className="p-4 border-t bg-slate-50">
                <div className="flex gap-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me anything about health, nutrition, or fitness..."
                    className="flex-1"
                    disabled={isSending}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isSending}
                    className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                  >
                    {isSending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Bot className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-600 mb-2">
                  Select or start a conversation
                </h3>
                <Button
                  onClick={handleNewConversation}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 mt-4"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Start New Chat
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}