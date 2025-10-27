// src/jspdf.d.ts
declare module 'jspdf' {
  interface jsPDF {
    setLineDash(pattern: number[], phase: number): void;
    setLineDash(): void; // For resetting to solid line
  }
}