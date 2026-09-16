import re

with open('main.py', 'r') as f:
    main_content = f.read()

# Add email sending logic
email_logic = """
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def enviar_email_recuperacao(destinatario: str, reset_link: str):
    smtp_host = os.environ.get("SMTP_HOST")
    smtp_port = os.environ.get("SMTP_PORT", 587)
    smtp_user = os.environ.get("SMTP_USERNAME")
    smtp_pass = os.environ.get("SMTP_PASSWORD")
    smtp_from = os.environ.get("SMTP_FROM_EMAIL", "suporte@ritmesa.com.br")

    if not all([smtp_host, smtp_user, smtp_pass]):
        print(f"\\n[MOCK EMAIL] Para: {destinatario}\\nLink: {reset_link}\\nConfigure as variáveis SMTP para enviar e-mails reais.\\n")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Recuperação de Senha - Ritmesa"
    msg["From"] = smtp_from
    msg["To"] = destinatario

    html = f\"\"\"
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #f97316;">Ritmesa</h2>
        <p>Olá,</p>
        <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
        <p>Clique no botão abaixo para criar uma nova senha. Este link é válido por 15 minutos.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{reset_link}" style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Redefinir Minha Senha</a>
        </div>
        <p style="font-size: 12px; color: #999;">Se você não solicitou a redefinição, apenas ignore este e-mail.</p>
      </body>
    </html>
    \"\"\"

    msg.attach(MIMEText(html, "html"))

    try:
        server = smtplib.SMTP(smtp_host, int(smtp_port))
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_from, destinatario, msg.as_string())
        server.quit()
    except Exception as e:
        print(f"Erro ao enviar e-mail SMTP: {e}")
"""

# Inject before forgot_password route
main_content = main_content.replace("@app.post(\"/auth/forgot-password\")", email_logic + "\n@app.post(\"/auth/forgot-password\")")

# Replace the mock print statements in forgot_password with actual function call
replace_pattern = r"print\(f\"\\n\\n=== EMAIL DE RECUPERAÇÃO ===\"\)\n\s+print\(f\"Para: \{email\}\"\)\n\s+print\(f\"Link: https://painel\.ritmesa\.com\.br/reset-password\?token=\{token\}\"\)\n\s+print\(f\"============================\\n\\n\"\)"
replacement = r"""
    reset_link = f"https://painel.ritmesa.com.br/reset-password?token={token}"
    try:
        enviar_email_recuperacao(email, reset_link)
    except Exception as e:
        print(f"Failed to send email async: {e}")
"""
main_content = re.sub(replace_pattern, replacement, main_content)

with open('main.py', 'w') as f:
    f.write(main_content)
