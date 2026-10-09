import { Doto, Inter, Recursive } from 'next/font/google';
import styles from '../styles/Home.module.css';
import '../styles/globals.css';
import { THEME_INIT_SCRIPT } from '../components/theme';

const doto = Doto({
	subsets: ['latin'],
	weight: ['400', '600'],
	variable: '--font-doto',
	display: 'swap',
});

const inter = Inter({
	subsets: ['latin'],
	weight: ['400', '700'],
	variable: '--font-inter',
	display: 'swap',
});

const recursive = Recursive({ subsets: ['latin'], variable: '--font-recursive', display: 'swap' });

export default function RootLayout({ children }) {
	return (
		<html lang="en" suppressHydrationWarning className={`${doto.variable} ${inter.variable} ${recursive.variable}`}>
			<head>
				<script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
				<title>Shitemap.js</title>
				<meta name="description" content="Visual sitemap explorer" />
				<meta name="author" content="las6 — https://las6.net" />
				<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
				<link rel="alternate icon" href="/favicon.ico" sizes="any" />
				<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
			</head>
			<body>
				<div className={styles.container}>
					<main className={styles.main}>
						{children}
					</main>
				</div>
			</body>
		</html>
	);
}
