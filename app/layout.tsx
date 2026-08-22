export const metadata = {
  title: 'Call Evaluator AI',
  description: 'AI-powered call transcript evaluation platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ 
        margin: 0, 
        padding: 0, 
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        backgroundColor: '#ffffff',
        color: '#2D2D2D',
        lineHeight: 1.6
      }}>
        {children}
      </body>
    </html>
  );
}