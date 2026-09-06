import re

filepath = 'backend/main.py'
with open(filepath, 'r') as f:
    content = f.read()

old_except = """    except ValueError as e:
        raise HTTPException(status_code=401, detail="Token inválido")"""

new_except = """    except Exception as e:
        import traceback
        err_str = traceback.format_exc()
        # Save error globally to read it later
        global last_google_auth_error
        last_google_auth_error = err_str
        print("GOOGLE AUTH ERROR:", err_str)
        raise HTTPException(status_code=500, detail=str(e))

last_google_auth_error = "Nenhum erro ainda"

@app.get("/auth/google/debug")
def debug_google_auth():
    return {"error": last_google_auth_error}"""

content = content.replace(old_except, new_except)

with open(filepath, 'w') as f:
    f.write(content)
