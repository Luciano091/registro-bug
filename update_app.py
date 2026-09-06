filepath = 'frontend-publico/src/App.tsx'
with open(filepath, 'r') as f:
    content = f.read()

imports = """import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';"""

content = content.replace("import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';", imports)

providers = """    <GoogleOAuthProvider clientId="190788590463-vmt6leseuk1o1g8knrsi6f6he801ga1l.apps.googleusercontent.com">
      <NetworkProvider>
        <CartProvider>
          <Router>
            <div className="min-h-screen flex flex-col bg-zinc-50">
              <Routes>
                <Route path="/" element={<PublicMenu />} />
                <Route path="/:estabelecimento" element={<PublicMenu />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </Router>
        </CartProvider>
      </NetworkProvider>
    </GoogleOAuthProvider>"""

old_providers = """    <NetworkProvider>
      <CartProvider>
        <Router>
          <div className="min-h-screen flex flex-col bg-zinc-50">
            <Routes>
              <Route path="/" element={<PublicMenu />} />
              <Route path="/:estabelecimento" element={<PublicMenu />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </CartProvider>
    </NetworkProvider>"""

content = content.replace(old_providers, providers)

with open(filepath, 'w') as f:
    f.write(content)
