import smtplib
from email.mime.text import MIMEText
import os

msg = MIMEText('Test email from bias audit app')
msg['Subject'] = 'Test Email'
msg['From'] = 'noreply@bias-audit.com'
msg['To'] = 'viveksaravanan295@gmail.com'

smtp_server = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
smtp_port = int(os.environ.get('SMTP_PORT', '587'))
smtp_username = os.environ.get('SMTP_USERNAME', '')
smtp_password = os.environ.get('SMTP_PASSWORD', '')

server = smtplib.SMTP(smtp_server, smtp_port)
server.starttls()
server.login(smtp_username, smtp_password)
server.send_message(msg)
server.quit()
print('Sent!')
