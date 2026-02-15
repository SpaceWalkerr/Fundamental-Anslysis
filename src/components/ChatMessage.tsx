import { motion } from "framer-motion";
import { FileText } from "lucide-react";

export interface ChatSource {
  document: string;
  page: number;
  excerpt: string;
}

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  isLoading?: boolean;
}

const ChatMessage = ({
  role,
  content,
  sources,
  isLoading = false,
}: ChatMessageProps) => {
  const isUser = role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div className={`max-w-[85%] space-y-2`}>
        {/* Message Bubble */}
        <div
          className={`px-4 py-3 rounded-xl ${
            isUser
              ? "bg-gradient-primary text-primary-foreground rounded-br-none"
              : "bg-secondary/80 text-foreground rounded-bl-none border border-border"
          }`}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce animation-delay-100" />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce animation-delay-200" />
              </div>
            </div>
          ) : (
            <p className="text-sm">{content}</p>
          )}
        </div>

        {/* Sources - Only for assistant messages */}
        {!isUser && sources && sources.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-2 ml-2"
          >
            <p className="text-xs font-medium text-muted-foreground">
              Sources:
            </p>
            {sources.map((source, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                className="p-2.5 rounded-lg bg-secondary/50 border border-border/50 text-xs hover:border-primary/30 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-2">
                  <FileText className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground/80 truncate">
                      {source.document}
                    </p>
                    <p className="text-muted-foreground/80">Page {source.page}</p>
                    <p className="text-muted-foreground/60 mt-1 line-clamp-2 italic">
                      "{source.excerpt}"
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default ChatMessage;
