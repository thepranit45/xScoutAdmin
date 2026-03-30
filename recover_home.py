import os, re

log_file = r"C:\Users\thepr\.gemini\antigravity\brain\0a0688c5-34f7-431d-a412-afb60706d384\.system_generated\logs\overview.txt"

with open(log_file, "r", encoding="utf-8") as f:
    text = f.read()

# Grab Step 232 text
s1 = text.find("Step Id: 232")
e1 = text.find("The above content does NOT show", s1)
p1 = text[s1:e1]

s2 = text.find("Step Id: 237")  
e2 = text.find("The above content does NOT show", s2)
p2 = text[s2:e2]

def clean(raw_text):
    out = []
    for line in raw_text.split('\n'):
        m = re.match(r"^(\d+):\s?(.*)", line)
        if m:
            out.append(m.group(2))
    return out

lines1 = clean(p1)
lines2 = clean(p2)

# merge, preventing overlap. 
lines = {}
for i, l in enumerate(lines1):
    lines[i+1] = l

start_idx_2 = 800
for i, l in enumerate(lines2):
    lines[start_idx_2 + i] = l

final_lines = [lines[k] for k in sorted(lines.keys())]
home_content = "\n".join(final_lines)

with open(r"d:\xScout\templates\home.html", "w", encoding="utf-8") as f:
    f.write(home_content)
with open(r"d:\xScout\AdminDashboard\templates\home.html", "w", encoding="utf-8") as f:
    f.write(home_content)

print("Recovered full file! length:", len(home_content))
