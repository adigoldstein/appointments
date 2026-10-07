export interface NavItem {
  readonly label: string;
  /** Relative to the area's base URL (ADR-0005); '' is the area's home. */
  readonly path: string;
}
