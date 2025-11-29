import sys
import os
from pdf2docx import Converter

def main():
    if len(sys.argv) < 3:
        print("Usage: python pdf_to_docx.py <input_path> <output_path>")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    try:
        cv = Converter(input_file)
        cv.convert(output_file)
        cv.close()
        print("Conversion Successful")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()