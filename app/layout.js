import "./globals.css";

export const metadata = { title: "Pickleball Booking", description: "Barebones court booking" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <a className="brand" href="/">🏓 PickleBook</a>
          <a href="/">Courts</a>
          <a href="/my-bookings">My Bookings</a>
          <a href="/admin">Admin</a>
        </nav>
        {children}
      </body>
    </html>
  );
}
