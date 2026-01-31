import React from "react";
import * as styles from "./Header.css";

export const Header: React.FC = () => {
  return (
    <header className={styles.header}>
      <div className={styles.branding}>BLW Dataviz</div>
    </header>
  );
};
