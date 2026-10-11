"""Generate nine separate BisBurger QR inserts on one A4 sheet.

Run with the bundled PDF Python runtime or any Python with ReportLab installed.
Print at 100% scale; the QR square is 26 mm wide.
"""

from pathlib import Path

from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


DESTINATION = "https://bisburger.ritmesa.com.br/conecte"
OUTPUT = Path(__file__).resolve().parents[2] / "output/pdf/bisburger-cartao-qr-a4.pdf"
FONT_DIR = Path("/usr/share/fonts/truetype/dejavu")


def draw_qr(pdf: canvas.Canvas, x: float, y: float, size: float) -> None:
    qr = QrCodeWidget(DESTINATION)
    qr.barLevel = "H"
    bounds = qr.getBounds()
    width = bounds[2] - bounds[0]
    height = bounds[3] - bounds[1]
    drawing = Drawing(size, size, transform=[size / width, 0, 0, size / height, 0, 0])
    drawing.add(qr)
    renderPDF.draw(drawing, pdf, x, y)


def draw_card(pdf: canvas.Canvas, x: float, y: float) -> None:
    w, h = 60 * mm, 88 * mm
    center = x + w / 2
    orange = colors.HexColor("#ED6A08")
    ink = colors.HexColor("#1D2026")

    # Light guide for cutting individual cards from an A4 sheet.
    pdf.setStrokeColor(colors.HexColor("#BFC3C8"))
    pdf.setLineWidth(0.4)
    pdf.setDash(2, 2)
    pdf.rect(x, y, w, h, stroke=1, fill=0)
    pdf.setDash()

    pdf.setFillColor(orange)
    pdf.roundRect(x + 5 * mm, y + h - 17 * mm, w - 10 * mm, 1.5 * mm, 0.7 * mm, fill=1, stroke=0)
    pdf.setFont("DejaVu-Bold", 15)
    pdf.drawCentredString(center, y + h - 14 * mm, "BisBurger")

    pdf.setFillColor(ink)
    pdf.setFont("DejaVu-Bold", 10)
    pdf.drawCentredString(center, y + h - 25 * mm, "Obrigado pelo pedido!")
    pdf.setFont("DejaVu", 8.1)
    pdf.drawCentredString(center, y + h - 30 * mm, "Aponte a câmera para o QR code")

    qr_size = 26 * mm
    qr_x = center - qr_size / 2
    qr_y = y + 20.5 * mm
    # Keep a white quiet zone around the code for reliable scanning.
    pdf.setFillColor(colors.white)
    pdf.roundRect(qr_x - 2.5 * mm, qr_y - 2.5 * mm, qr_size + 5 * mm, qr_size + 5 * mm, 2 * mm, fill=1, stroke=0)
    draw_qr(pdf, qr_x, qr_y, qr_size)

    pdf.setFillColor(ink)
    pdf.setFont("DejaVu-Bold", 8.5)
    pdf.drawCentredString(center, y + 15 * mm, "Peça de novo • avalie • converse")
    pdf.setFillColor(colors.HexColor("#555B62"))
    pdf.setFont("DejaVu", 6.5)
    pdf.drawCentredString(center, y + 9.7 * mm, "Instagram também está por aqui")
    pdf.setFont("DejaVu", 6)
    pdf.drawCentredString(center, y + 5.3 * mm, "bisburger.ritmesa.com.br/conecte")


def main() -> None:
    pdfmetrics.registerFont(TTFont("DejaVu", str(FONT_DIR / "DejaVuSans.ttf")))
    pdfmetrics.registerFont(TTFont("DejaVu-Bold", str(FONT_DIR / "DejaVuSans-Bold.ttf")))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    pdf = canvas.Canvas(str(OUTPUT), pagesize=A4)
    pdf.setTitle("BisBurger - cartões QR para acompanhar pedidos")
    pdf.setAuthor("BisBurger")

    card_w, card_h = 60 * mm, 88 * mm
    gap_x, gap_y = 5 * mm, 4 * mm
    start_x = (A4[0] - (3 * card_w + 2 * gap_x)) / 2
    start_y = (A4[1] - (3 * card_h + 2 * gap_y)) / 2
    for row in range(3):
        for column in range(3):
            draw_card(pdf, start_x + column * (card_w + gap_x), start_y + row * (card_h + gap_y))

    pdf.showPage()
    pdf.save()
    print(OUTPUT)


if __name__ == "__main__":
    main()
