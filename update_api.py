filepath = 'frontend-publico/src/services/api.ts'
with open(filepath, 'r') as f:
    content = f.read()

old_interceptor = """api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {"""

new_interceptor = """api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken') || localStorage.getItem('cliente_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {"""

content = content.replace(old_interceptor, new_interceptor)

with open(filepath, 'w') as f:
    f.write(content)
