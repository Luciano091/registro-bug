import urllib.request
from rembg import remove, new_session
import sys

def test():
    try:
        print("Downloading sample image...")
        url = "https://picsum.photos/200/300" # random image
        req = urllib.request.urlopen(url)
        input_bytes = req.read()
        
        print("Creating session...")
        session = new_session("u2netp")
        
        print("Removing background...")
        output_bytes = remove(input_bytes, session=session)
        
        print(f"Input size: {len(input_bytes)}")
        print(f"Output size: {len(output_bytes)}")
        if len(output_bytes) > 0:
            print("Success!")
    except Exception as e:
        print(f"Error: {e}")

test()
