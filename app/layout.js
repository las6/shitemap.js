import { Doto, Inter } from 'next/font/google';
import styles from '../styles/Home.module.css';
import '../styles/globals.css';

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

export default function RootLayout({ children }) {
	return (
		<html lang="en" className={`${doto.variable} ${inter.variable}`}>
			<head>
				<title>Shitemap.js</title>
				<meta name="description" content="Visual sitemap explorer" />
				<link rel="icon" href="/favicon.ico" />
				<link
					rel="stylesheet"
					href="https://fonts.googleapis.com/css2?family=Material+Symbols+Sharp:opsz,wght,FILL,GRAD@20,300,0,0&icon_names=open_in_new"
				/>
			</head>
			<body>
				<div className={styles.container}>
					<main className={styles.main}>
						<h1 className={styles.title}>Shitemap.js</h1>
						{children}
					</main>
				</div>
			</body>
		</html>
	);
}
