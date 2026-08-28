export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang="pt-BR">
			<body>
				<div className="bg-white">
					{children}
				</div>
			</body>
		</html>
	)
}