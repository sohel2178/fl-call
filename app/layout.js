import { Archivo, Hind_Siliguri } from 'next/font/google';
import './globals.css';
import AuthGate from '../components/AuthGate';

// Archivo (variable width) for headings and numbers; Hind Siliguri for body
// text — it covers Latin and Bengali, so Bangla names render properly.
const archivo = Archivo({ subsets: ['latin'], axes: ['wdth'], variable: '--font-archivo', display: 'swap' });
const hind = Hind_Siliguri({
  subsets: ['latin', 'bengali'], weight: ['400', '500', '600'], variable: '--font-hind', display: 'swap',
});

export const metadata = {
  title: 'FleetCall',
  description: 'Sultan Tracker calling console: Bangla voice reminders, SIM reachability checks and PBX extensions.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${archivo.variable} ${hind.variable}`}>
      <body><AuthGate>{children}</AuthGate></body>
    </html>
  );
}
