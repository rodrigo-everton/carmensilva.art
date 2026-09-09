export default function VendaLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return <div className="bg-white">{children}</div>
}
