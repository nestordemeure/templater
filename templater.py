from reportlab.lib import pagesizes
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

#----------------------------------------------------------------------------------------
# PARAMETERS

# Specify the path to the images and the path for the output PDF
image_paths = ['front.png', 'back.png']
output_pdf_path = 'output.pdf'

# Dimensions of the paper
page_width, page_height = pagesizes.letter

# Dimensions of the margins
top_margin = 0.5 * inch 
side_margin = 0.75 * inch

# Dimensions of the business card
image_width = 3.5 * inch
image_height = 2 * inch

# Number of rows and columns
nb_rows = 5
nb_columns = 2

#----------------------------------------------------------------------------------------
# pdf creation

# Create a new canvas object
canv = canvas.Canvas(output_pdf_path, pagesize=(page_width, page_height))

# create one page per image
for image_path in image_paths:
    # Draw rows and columns of the image
    for r in range(nb_rows):
        for c in range(nb_columns):
            # Set the position for the image
            # bottom left corner starting from the bottom left of the page
            x_position = side_margin + c * image_width
            y_position = top_margin + r * image_height
            # Add the image
            canv.drawImage(image_path, x_position, y_position, 
                        width=image_width, height=image_height, 
                        preserveAspectRatio=True)

    # Draw cut lines at the margins
    horizontal_cut_line_length = side_margin / 2
    for r in range(nb_rows + 1):
        # Horizontal cut lines
        y_position = top_margin + r * image_height
        canv.line(0, y_position, horizontal_cut_line_length, y_position)  # Left margin
        canv.line(page_width - horizontal_cut_line_length, y_position, page_width, y_position)  # Right margin
    vertical_cut_line_length = top_margin / 2
    for c in range(nb_columns + 1):
        # Vertical cut lines
        x_position = side_margin + c * image_width
        canv.line(x_position, 0, x_position, vertical_cut_line_length)  # Bottom margin
        canv.line(x_position, page_height - vertical_cut_line_length, x_position, page_height)  # Top margin
    
    # End the page to start a new page
    canv.showPage()

# Save the PDF
canv.save()
