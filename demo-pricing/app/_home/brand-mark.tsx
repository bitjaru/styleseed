import styles from "./home.module.css";

/** Opposing upright modules on an ink tile. */
export function BrandMark() {
  return <svg className={styles.mark} viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" focusable="false">
    <rect className={styles.markTile} width="32" height="32" rx="8" />
    <path className={styles.markUpper} d="M24 7H13a6 6 0 0 0 0 12h2v-4h-2a2 2 0 0 1 0-4h11Z" />
    <path className={styles.markLower} d="M8 25h11a6 6 0 0 0 0-12h-2v4h2a2 2 0 0 1 0 4H8Z" />
  </svg>;
}
