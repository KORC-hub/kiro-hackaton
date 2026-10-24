import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Notas y repaso',
  description: 'Notas con backlinks y tarjetas de estudio',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
