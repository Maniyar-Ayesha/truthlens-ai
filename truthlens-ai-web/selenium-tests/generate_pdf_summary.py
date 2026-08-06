from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def generate_pdf_summary():
    pdf = SimpleDocTemplate("TruthLens_Test_Summary.pdf", pagesize=letter)
    styles = getSampleStyleSheet()
    title_style = styles['Heading1']
    title_style.alignment = 1
    
    normal_style = styles['Normal']
    
    elements = []
    
    title = Paragraph("TruthLens AI QA Test Summary", title_style)
    elements.append(title)
    elements.append(Spacer(1, 20))
    
    intro = Paragraph("This report summarizes the execution of the TruthLens AI QA Automation Framework.", normal_style)
    elements.append(intro)
    elements.append(Spacer(1, 20))
    
    data = [
        ["Metric", "Value"],
        ["Total Test Cases Designed", "333"],
        ["Test Cases Executed", "3"],
        ["Passed", "3"],
        ["Failed", "0"],
        ["Skipped", "0"],
        ["Automation Coverage", "Selected Core Flows (Smoke Suite)"],
        ["Execution Time", "~15 seconds"]
    ]
    
    t = Table(data, colWidths=[200, 200])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#4F81BD")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor("#F2F2F2")),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))
    
    elements.append(t)
    elements.append(Spacer(1, 30))
    
    remarks = Paragraph("Remarks: Selenium automation scripts were executed successfully. Detailed test cases are available in TruthLens_AI_TestCases.xlsx.", normal_style)
    elements.append(remarks)
    
    pdf.build(elements)
    print("TruthLens_Test_Summary.pdf generated successfully.")

if __name__ == "__main__":
    generate_pdf_summary()
