
import { motion, AnimatePresence } from "framer-motion";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";
import { PropsWithChildren } from "react";

// Assuming ThemeProvider from ThemeContext applies 'dark' class to html or body
// and Tailwind CSS is configured to use CSS variables for colors.

interface MainLayoutProps {
  className?: string;
}

const MainLayout = ({ children, className }: PropsWithChildren<MainLayoutProps>) => {
  const baseClasses = clsx(
    "flex min-h-screen w-full bg-background text-foreground",
    "dark:bg-background dark:text-foreground", // Ensure dark mode styles are applied
    className
  );

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="main-layout"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className={twMerge(baseClasses, "relative")}
      >
        {/* Basic structure that can be adapted for Bento Grid */}
        <main className="flex flex-1 w-full">
          {/* Sidebar or Navigation placeholder - can be a fixed column or collapsible */}
          <aside className={twMerge("w-64 bg-card p-4 min-h-screen", "hidden lg:block")}>
            {/* Sidebar content will go here */}
            <div className="text-lg font-semibold mb-4">Navigation</div>
            <nav>
              <ul>
                <li className="mb-2"><a href="#" className="hover:text-primary">Dashboard</a></li>
                <li className="mb-2"><a href="#" className="hover:text-primary">Products</a></li>
                <li className="mb-2"><a href="#" className="hover:text-primary">Orders</a></li>
              </ul>
            </nav>
          </aside>

          {/* Main content area */}
          <div className={twMerge(
            "flex-1 p-8",
            "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" // Basic grid setup for Bento
          )}>
            {children}
          </div>
        </main>
      </motion.div>
    </AnimatePresence>
  );
};

export default MainLayout;
