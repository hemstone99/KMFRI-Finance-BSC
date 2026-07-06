import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, Trash2, Loader2, Sparkles } from "lucide-react";
import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SUGGESTED_QUESTIONS = [
  "What are my current KPI assignments?",
  "How do I submit KPI data?",
  "Explain the BSC Financial perspective",
  "What does an anomaly alert mean?",
  "How are KPIs assigned in this system?",
  "What is the approval workflow?",
];

export default function AIAssistant() {
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: history, refetch } = trpc.ai.history.useQuery();
  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: () => { refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const clearMutation = trpc.ai.clearHistory.useMutation({
    onSuccess: () => { refetch(); toast.success("Chat history cleared"); },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const handleSend = () => {
    if (!message.trim() || chatMutation.isPending) return;
    const msg = message.trim();
    setMessage("");
    chatMutation.mutate({ message: msg });
  };

  return (
    <div className="space-y-4 animate-fade-up h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ background: "linear-gradient(135deg, #0d2240, #0a3d5c)" }}>
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-['Poppins']">AI Assistant</h1>
            <p className="text-gray-500 text-sm">KMFRI BSC intelligent assistant powered by AI</p>
          </div>
        </div>
        {(history ?? []).length > 0 && (
          <Button variant="outline" size="sm" className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => clearMutation.mutate()}>
            <Trash2 className="w-3.5 h-3.5" /> Clear History
          </Button>
        )}
      </div>

      <Card className="border-0 shadow-sm flex-1 flex flex-col min-h-0" style={{ minHeight: "500px" }}>
        <CardContent className="flex flex-col h-full p-0">
          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {(history ?? []).length === 0 && !chatMutation.isPending ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <div className="p-4 rounded-2xl mb-4" style={{ background: "linear-gradient(135deg, #0d2240, #0a3d5c)" }}>
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-semibold text-gray-800 text-lg">KMFRI BSC AI Assistant</h3>
                <p className="text-gray-500 text-sm mt-2 max-w-sm">Ask me anything about your KPIs, performance targets, the BSC framework, or how to use this system.</p>
                <div className="grid grid-cols-2 gap-2 mt-6 w-full max-w-lg">
                  {SUGGESTED_QUESTIONS.map(q => (
                    <button key={q} onClick={() => { setMessage(q); }}
                      className="text-left text-xs p-3 rounded-xl bg-gray-50 hover:bg-blue-50 hover:text-blue-700 border border-gray-100 hover:border-blue-200 transition-all">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {(history ?? []).map((msg, i) => (
                  <div key={i} className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className={cn("text-xs font-bold", msg.role === "user" ? "bg-blue-700 text-white" : "bg-gray-800 text-white")}>
                        {msg.role === "user" ? "U" : "AI"}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn("max-w-[75%] rounded-2xl px-4 py-3 text-sm",
                      msg.role === "user"
                        ? "bg-blue-700 text-white rounded-tr-sm"
                        : "bg-gray-100 text-gray-800 rounded-tl-sm"
                    )}>
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none text-gray-800">
                          <Streamdown>{msg.content}</Streamdown>
                        </div>
                      ) : (
                        <p>{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {chatMutation.isPending && (
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-xs font-bold bg-gray-800 text-white">AI</AvatarFallback>
                    </Avatar>
                    <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                      <span className="text-sm text-gray-500">Thinking...</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Ask about your KPIs, performance targets, or system guidance..."
                className="flex-1 h-11"
                disabled={chatMutation.isPending}
              />
              <Button onClick={handleSend} disabled={!message.trim() || chatMutation.isPending}
                className="h-11 px-4 gap-2" style={{ background: "linear-gradient(135deg, #0d2240, #0a3d5c)" }}>
                {chatMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
