import React from "react";
import * as styles from "./PageLayout.css";
import { Header } from "../Header";

export interface PageLayoutProps {
  /** Main page content */
  children: React.ReactNode;
  /** Maximum width of content column (default: 1200px) */
  maxWidth?: string;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  maxWidth,
}) => {
  return (
    <div className={styles.container}>
      <Header />
      <div className={styles.contentWrapper}>
        <main
          className={styles.content}
          style={maxWidth ? { maxWidth } : undefined}
        >
          {children}
        </main>
      </div>
    </div>
  );
};
