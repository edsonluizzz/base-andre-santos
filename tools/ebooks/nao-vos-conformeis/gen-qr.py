"""Gera o QR Code da apostila EBA apontando para o funil de captura.
Cor navy da marca (#0d1b2a) sobre branco, alta correcao de erro."""
import qrcode
from qrcode.constants import ERROR_CORRECT_H

URL = "https://leads.prandresantos.com.br/ebook/nao-vos-conformeis"
OUT = "qr.png"

qr = qrcode.QRCode(version=None, error_correction=ERROR_CORRECT_H, box_size=20, border=2)
qr.add_data(URL)
qr.make(fit=True)
img = qr.make_image(fill_color="#0d1b2a", back_color="white")
img.save(OUT)
print(f"QR gerado: {OUT} -> {URL}")
