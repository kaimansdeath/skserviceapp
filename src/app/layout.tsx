import type { ReactNode } from "react";

// Кореневий layout — лише проксі; locale-layout нижче задає <html lang>
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
