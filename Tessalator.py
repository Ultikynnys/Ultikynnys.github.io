import math
import random
import os
from PIL import Image, ImageDraw

def generate_true_tessellated_triangles(
    image_size=300,
    background_color=255,  # White background
    triangle_size=50,       # Length of each triangle side
    grayscale_min=50,       # Minimum grayscale value
    grayscale_max=200       # Maximum grayscale value
):
    """
    Generates a truly tessellated triangle pattern with no gaps.

    Parameters:
    - image_size: Size of the square image in pixels.
    - background_color: Grayscale value for the background (0-255).
    - triangle_size: Length of each triangle side in pixels.
    - grayscale_min: Minimum grayscale value for triangles.
    - grayscale_max: Maximum grayscale value for triangles.

    Returns:
    - PIL Image object with the generated pattern.
    """
    # Calculate height of an equilateral triangle
    triangle_height = triangle_size * (math.sqrt(3) / 2)
    
    # Create a new grayscale image
    img = Image.new('L', (image_size, image_size), background_color)
    draw = ImageDraw.Draw(img)
    
    # Determine the number of triangles needed horizontally and vertically
    cols = int(math.ceil(image_size / triangle_size)) + 1
    rows = int(math.ceil(image_size / triangle_height)) + 1
    
    for row in range(rows):
        row_grayscale_up = random.randint(grayscale_min, grayscale_max)  # Store the grayscale for the first upward triangle in the row
        row_grayscale_down = random.randint(grayscale_min, grayscale_max)  # Store the grayscale for the first downward triangle in the row
        
        for col in range(cols):
            # Calculate the base x, y positions
            x_base = col * triangle_size - triangle_size/2
            y_base = row * triangle_height
            # Offset every alternate row
            if row % 2 == 1:
                x_base -= triangle_size / 2
            V1 = (x_base,y_base+triangle_height) 
            V2 = (x_base+triangle_size/2,y_base) 
            V3 = (x_base+triangle_size,y_base+triangle_height) 
            V4 = (x_base+triangle_size+triangle_size/2,y_base) 



            # Upward triangle vertices
            vertices_up = [
                V1,
                V2,
                V3
            ]

            # Downward triangle vertices
            vertices_down = [
                V2,
                V3,
                V4
            ]

            # Assign grayscale for upward triangle
            if col == 0:  # First triangle in the row
                row_grayscale_up = random.randint(grayscale_min, grayscale_max)
                grayscale_up = row_grayscale_up
            elif col == cols - 1:  # Last triangle in the row
                grayscale_up = row_grayscale_up
            else:  # Random grayscale for other triangles
                grayscale_up = random.randint(grayscale_min, grayscale_max)

            # Draw upward triangle
            draw.polygon(vertices_up, fill=grayscale_up, outline=None)

            # Assign grayscale for downward triangle
            if col == 0:  # First triangle in the row
                row_grayscale_down = random.randint(grayscale_min, grayscale_max)
                grayscale_down = row_grayscale_down
            elif col == cols - 1:  # Last triangle in the row
                grayscale_down = row_grayscale_down
            else:  # Random grayscale for other triangles
                grayscale_down = random.randint(grayscale_min, grayscale_max)

            # Draw downward triangle
            draw.polygon(vertices_down, fill=grayscale_down, outline=None)

    return img


# Define constants for the image
IMAGE_SIZE = 300
BACKGROUND_COLOR = 255
TRIANGLE_SIZE = 50
GRAYSCALE_MIN = 50
GRAYSCALE_MAX = 200

# Generate the final tessellated triangles image without gaps
tessellated_img = generate_true_tessellated_triangles(
    image_size=IMAGE_SIZE,
    background_color=BACKGROUND_COLOR,
    triangle_size=TRIANGLE_SIZE,
    grayscale_min=GRAYSCALE_MIN,
    grayscale_max=GRAYSCALE_MAX
)

# Get the directory of the current script
script_dir = os.path.dirname(os.path.abspath(__file__))

# Define the output file path
tessellated_output_path = os.path.join(script_dir, "true_tessellated_triangles.png")

# Save the image to the same directory as the script
tessellated_img.save(tessellated_output_path)

# Output the saved file path
print(f"Image saved at: {tessellated_output_path}")
