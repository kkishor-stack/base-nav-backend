// The filename "hello.js" automatically creates the route "/api/hello"
export default function handler(req, res) {
  // Only GET requests will be handled here unless you add logic to check req.method
  if (req.method === 'GET') {
    res.status(200).json({ message: "Hello from a standard Vercel function!" });
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}