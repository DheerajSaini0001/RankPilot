import sys
try:
    import pypdf
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pypdf", "--quiet"])
    import pypdf

def read_pdf(file_path):
    reader = pypdf.PdfReader(file_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    with open(file_path + ".txt", "w", encoding="utf-8") as f:
        f.write(text)
    print(f"Successfully extracted text to {file_path}.txt")

if __name__ == "__main__":
    read_pdf(sys.argv[1])
