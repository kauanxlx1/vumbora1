import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Info, AlertCircle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full p-4 sm:p-0">
      <AnimatePresence>
        {toasts.map((toast) => {
          const icons = {
            success: <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />,
            info: <Info className="h-5 w-5 text-blue-500 shrink-0" />,
            error: <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />,
          };

          const bgColors = {
            success: 'bg-emerald-50 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/40',
            info: 'bg-blue-50 border-blue-100 dark:bg-blue-950/30 dark:border-blue-900/40',
            error: 'bg-rose-50 border-rose-100 dark:bg-rose-950/30 dark:border-rose-900/40',
          };

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              layout
              className={`flex items-start gap-3 p-3.5 rounded-xl border shadow-lg text-xs font-semibold ${bgColors[toast.type]} backdrop-blur-md`}
            >
              {icons[toast.type]}
              
              <div className="flex-1 text-slate-800 dark:text-slate-200 min-w-0">
                <p className="break-words">{toast.message}</p>
                {toast.action && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toast.action?.onClick();
                      onDismiss(toast.id);
                    }}
                    className="mt-1.5 inline-block text-xs font-extrabold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline cursor-pointer"
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>

              <button
                onClick={() => onDismiss(toast.id)}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
