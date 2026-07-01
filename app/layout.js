export const metadata = {
  title: "Instagram Poster",
  description: "Connect Instagram and publish a post via the Graph API",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
